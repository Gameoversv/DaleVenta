import type { DenominationCountEntry, DenominationResponse } from "@/types/cash-shift";
import type { CreditAccountResponse, CreditProfileResponse } from "@/types/credit";

/**
 * Money arithmetic and payment rules for the point-of-sale checkout.
 *
 * These lived inline in a 578-line component, which made the rules that decide whether a sale
 * may be confirmed impossible to test: a wrong total or an over-limit credit sale would only
 * ever surface at the counter.
 */

export interface TotalsInput {
  /** Sum of the cart lines, before any discount. */
  preDiscountTotal: number;
  /** Raw text from the discount field; anything unparseable counts as no discount. */
  discountInput: string;
  /** Whether the cashier holds SALE_DISCOUNT. Without it a typed discount is ignored. */
  canDiscount: boolean;
  hasRentalItems: boolean;
  /** Raw text from the deposit field, only meaningful when the cart has rental items. */
  rentalDeposit: string;
}

export interface Totals {
  discountAmount: number;
  /** Cart total after the discount, never below zero. */
  saleTotal: number;
  rentalDepositAmount: number;
  /** What the customer actually pays: the sale plus any rental deposit. */
  total: number;
}

function positiveNumber(value: string | number | null | undefined): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function checkoutTotals(input: TotalsInput): Totals {
  const discountAmount = input.canDiscount ? positiveNumber(input.discountInput) : 0;
  // A discount larger than the cart must not turn into money owed to the customer.
  const saleTotal = Math.max(0, input.preDiscountTotal - discountAmount);
  const rentalDepositAmount = input.hasRentalItems ? positiveNumber(input.rentalDeposit) : 0;
  return {
    discountAmount,
    saleTotal,
    rentalDepositAmount,
    total: saleTotal + rentalDepositAmount,
  };
}

/** Face value of the bills and coins the cashier says they received. */
export function sumDenominations(
  entries: DenominationCountEntry[],
  denominations: DenominationResponse[] | undefined
): number {
  return entries.reduce((sum, entry) => {
    const denomination = denominations?.find((d) => d.id === entry.denominationId);
    return sum + (denomination ? Number(denomination.value) * entry.quantity : 0);
  }, 0);
}

/**
 * Change owed, in cents. Computed in cents on purpose: 0.1 + 0.2 is not 0.3 in binary floating
 * point, so comparing pesos directly can decide a sale is short by a fraction of a centavo.
 * Negative means the cashier has not received enough yet.
 */
export function changeAmountCents(receivedTotal: number, amountDue: number): number {
  return Math.round((receivedTotal - amountDue) * 100);
}

/**
 * How much this customer may still put on credit.
 * `null` when the profile or account has not loaded, `Infinity` when the limit is unlimited.
 */
export function creditAvailable(
  profile: CreditProfileResponse | undefined,
  account: CreditAccountResponse | undefined
): number | null {
  if (!profile || !account) return null;
  if (profile.creditLimit == null) return Infinity;
  return Number(profile.creditLimit) - Number(account.balance);
}

export interface ReadinessInput {
  method: "CASH" | "TRANSFER" | "CREDIT" | "MIXED";
  total: number;
  /** Whether the tenant counts cash by denomination rather than typing an amount. */
  cashDenominationsEnabled: boolean;

  // Plain cash
  changeCents: number;
  receivedEntryCount: number;
  /** Whether the backend could make exact change from the drawer. */
  suggestionExact: boolean;
  directReceivedAmount: number;

  // Transfer
  bank: string;
  reference: string;

  // Mixed: part cash, remainder on another method
  mixedCashAmount: number;
  mixedSecondMethod: "TRANSFER" | "CREDIT";
  mixedChangeCents: number;
  mixedReceivedEntryCount: number;
  mixedSuggestionExact: boolean;
  mixedDirectReceivedAmount: number;
  mixedBank: string;
  mixedReference: string;

  // Credit
  creditEligible: boolean;
  creditAvailableAmount: number | null;

  // Rentals
  hasRentalItems: boolean;
  hasCustomer: boolean;
  rentalReturnAt: string;
}

export interface Readiness {
  cashReady: boolean;
  transferReady: boolean;
  mixedReady: boolean;
  creditReady: boolean;
  rentalReady: boolean;
  /** Every rule that must hold before the sale can be sent. */
  canConfirm: boolean;
}

function filled(value: string): boolean {
  return value.trim() !== "";
}

export function paymentReadiness(input: ReadinessInput): Readiness {
  const mixedRemaining = Math.max(0, input.total - input.mixedCashAmount);
  const mixedCreditAmount = input.mixedSecondMethod === "CREDIT" ? mixedRemaining : 0;
  const withinLimit = (amount: number) =>
    input.creditAvailableAmount !== null && amount <= input.creditAvailableAmount;

  const cashReady = input.cashDenominationsEnabled
    ? input.method === "CASH" &&
      input.changeCents >= 0 &&
      input.receivedEntryCount > 0 &&
      input.suggestionExact
    : input.method === "CASH" && input.directReceivedAmount >= input.total;

  const mixedCashReady = input.cashDenominationsEnabled
    ? input.mixedChangeCents >= 0 && input.mixedReceivedEntryCount > 0 && input.mixedSuggestionExact
    : input.mixedDirectReceivedAmount >= input.mixedCashAmount;

  const transferReady = input.method === "TRANSFER" && filled(input.bank) && filled(input.reference);

  const mixedReady =
    input.method === "MIXED" &&
    // The cash part has to be a real part: neither nothing nor the whole sale.
    input.mixedCashAmount > 0 &&
    input.mixedCashAmount < input.total &&
    mixedRemaining > 0 &&
    mixedCashReady &&
    (input.mixedSecondMethod === "TRANSFER"
      ? filled(input.mixedBank) && filled(input.mixedReference)
      : input.creditEligible && withinLimit(mixedCreditAmount));

  const creditReady = input.method === "CREDIT" && input.creditEligible && withinLimit(input.total);

  const rentalReady = !input.hasRentalItems || (input.hasCustomer && filled(input.rentalReturnAt));

  return {
    cashReady,
    transferReady,
    mixedReady,
    creditReady,
    rentalReady,
    canConfirm:
      input.total > 0 &&
      rentalReady &&
      (cashReady || transferReady || mixedReady || creditReady),
  };
}
