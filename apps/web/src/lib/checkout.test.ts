import { describe, expect, it } from "vitest";
import {
  changeAmountCents,
  checkoutTotals,
  creditAvailable,
  paymentReadiness,
  sumDenominations,
  type ReadinessInput,
} from "./checkout";

describe("checkoutTotals", () => {
  const base = {
    preDiscountTotal: 1000,
    discountInput: "",
    canDiscount: true,
    hasRentalItems: false,
    rentalDeposit: "",
  };

  it("subtracts a discount from the cart", () => {
    expect(checkoutTotals({ ...base, discountInput: "150" }).total).toBe(850);
  });

  it("ignores a discount typed by a cashier who lacks the permission", () => {
    const totals = checkoutTotals({ ...base, discountInput: "150", canDiscount: false });

    expect(totals.discountAmount).toBe(0);
    expect(totals.total).toBe(1000);
  });

  it("never lets a discount make the sale negative", () => {
    // Otherwise the register would owe the customer money.
    expect(checkoutTotals({ ...base, discountInput: "5000" }).total).toBe(0);
  });

  it("treats unparseable or negative discount text as no discount", () => {
    expect(checkoutTotals({ ...base, discountInput: "abc" }).discountAmount).toBe(0);
    expect(checkoutTotals({ ...base, discountInput: "-50" }).discountAmount).toBe(0);
    expect(checkoutTotals({ ...base, discountInput: "" }).discountAmount).toBe(0);
  });

  it("charges the rental deposit on top of the discounted sale", () => {
    const totals = checkoutTotals({
      ...base,
      discountInput: "100",
      hasRentalItems: true,
      rentalDeposit: "500",
    });

    expect(totals.saleTotal).toBe(900);
    expect(totals.rentalDepositAmount).toBe(500);
    expect(totals.total).toBe(1400);
  });

  it("ignores a deposit when the cart has nothing rentable", () => {
    const totals = checkoutTotals({ ...base, hasRentalItems: false, rentalDeposit: "500" });

    expect(totals.rentalDepositAmount).toBe(0);
    expect(totals.total).toBe(1000);
  });
});

describe("sumDenominations", () => {
  const denominations = [
    { id: "d500", value: "500.00", type: "BILL" as const, active: true },
    { id: "d100", value: "100.00", type: "BILL" as const, active: true },
    { id: "d25", value: "25.00", type: "COIN" as const, active: true },
  ];

  it("adds up face value times quantity", () => {
    const total = sumDenominations(
      [
        { denominationId: "d500", quantity: 2 },
        { denominationId: "d100", quantity: 3 },
        { denominationId: "d25", quantity: 4 },
      ],
      denominations
    );

    expect(total).toBe(1400);
  });

  it("is zero before the denomination catalog loads", () => {
    expect(sumDenominations([{ denominationId: "d500", quantity: 2 }], undefined)).toBe(0);
  });

  it("skips an entry whose denomination is unknown rather than counting it as zero-valued", () => {
    const total = sumDenominations(
      [
        { denominationId: "d500", quantity: 1 },
        { denominationId: "ghost", quantity: 9 },
      ],
      denominations
    );

    expect(total).toBe(500);
  });
});

describe("changeAmountCents", () => {
  it("is positive when the cashier received more than the sale", () => {
    expect(changeAmountCents(500, 250)).toBe(25000);
  });

  it("is zero on an exact payment", () => {
    expect(changeAmountCents(250, 250)).toBe(0);
  });

  it("is negative while the payment is short, which blocks confirmation", () => {
    expect(changeAmountCents(200, 250)).toBe(-5000);
  });

  it("does not report a fractional shortfall from binary floating point", () => {
    // 0.1 + 0.2 === 0.30000000000000004, so comparing pesos directly would call this short.
    expect(changeAmountCents(0.1 + 0.2, 0.3)).toBe(0);
  });
});

describe("creditAvailable", () => {
  const account = { balance: "400.00" } as never;

  it("is the limit minus what the customer already owes", () => {
    expect(creditAvailable({ creditLimit: "1000.00" } as never, account)).toBe(600);
  });

  it("is unlimited when the profile carries no limit", () => {
    expect(creditAvailable({ creditLimit: null } as never, account)).toBe(Infinity);
  });

  it("can go negative when the customer is already over the limit", () => {
    expect(creditAvailable({ creditLimit: "100.00" } as never, account)).toBe(-300);
  });

  it("is unknown until both the profile and the account have loaded", () => {
    expect(creditAvailable(undefined, account)).toBeNull();
    expect(creditAvailable({ creditLimit: "1000.00" } as never, undefined)).toBeNull();
  });
});

describe("paymentReadiness", () => {
  const base: ReadinessInput = {
    method: "CASH",
    total: 500,
    cashDenominationsEnabled: false,
    changeCents: 0,
    receivedEntryCount: 0,
    suggestionExact: false,
    directReceivedAmount: 0,
    bank: "",
    reference: "",
    mixedCashAmount: 0,
    mixedSecondMethod: "TRANSFER",
    mixedChangeCents: 0,
    mixedReceivedEntryCount: 0,
    mixedSuggestionExact: false,
    mixedDirectReceivedAmount: 0,
    mixedBank: "",
    mixedReference: "",
    creditEligible: false,
    creditAvailableAmount: null,
    hasRentalItems: false,
    hasCustomer: false,
    rentalReturnAt: "",
  };

  describe("cash", () => {
    it("is ready once the typed amount covers the sale", () => {
      expect(paymentReadiness({ ...base, directReceivedAmount: 500 }).cashReady).toBe(true);
      expect(paymentReadiness({ ...base, directReceivedAmount: 600 }).cashReady).toBe(true);
      expect(paymentReadiness({ ...base, directReceivedAmount: 499 }).cashReady).toBe(false);
    });

    it("requires exact change from the drawer when denominations are counted", () => {
      const counting = {
        ...base,
        cashDenominationsEnabled: true,
        changeCents: 0,
        receivedEntryCount: 1,
      };

      expect(paymentReadiness({ ...counting, suggestionExact: true }).cashReady).toBe(true);
      // The drawer cannot make the change, so the cashier must not confirm.
      expect(paymentReadiness({ ...counting, suggestionExact: false }).cashReady).toBe(false);
    });

    it("blocks a short payment even when the drawer could make change", () => {
      const short = {
        ...base,
        cashDenominationsEnabled: true,
        changeCents: -100,
        receivedEntryCount: 1,
        suggestionExact: true,
      };

      expect(paymentReadiness(short).cashReady).toBe(false);
    });
  });

  describe("transfer", () => {
    it("needs both the bank and the reference", () => {
      const transfer = { ...base, method: "TRANSFER" as const };

      expect(paymentReadiness({ ...transfer, bank: "Banreservas", reference: "REF-1" }).transferReady).toBe(true);
      expect(paymentReadiness({ ...transfer, bank: "Banreservas" }).transferReady).toBe(false);
      expect(paymentReadiness({ ...transfer, reference: "REF-1" }).transferReady).toBe(false);
    });

    it("rejects whitespace as a reference", () => {
      const transfer = { ...base, method: "TRANSFER" as const, bank: "  ", reference: "   " };

      expect(paymentReadiness(transfer).transferReady).toBe(false);
    });
  });

  describe("credit", () => {
    const credit = { ...base, method: "CREDIT" as const, creditEligible: true };

    it("is ready while the sale fits inside the available credit", () => {
      expect(paymentReadiness({ ...credit, creditAvailableAmount: 500 }).creditReady).toBe(true);
      expect(paymentReadiness({ ...credit, creditAvailableAmount: Infinity }).creditReady).toBe(true);
    });

    it("blocks a sale that would exceed the limit", () => {
      expect(paymentReadiness({ ...credit, creditAvailableAmount: 499 }).creditReady).toBe(false);
    });

    it("blocks a cashier who cannot authorise credit, whatever the limit", () => {
      expect(
        paymentReadiness({ ...credit, creditEligible: false, creditAvailableAmount: Infinity }).creditReady
      ).toBe(false);
    });

    it("blocks while the credit profile is still unknown", () => {
      expect(paymentReadiness({ ...credit, creditAvailableAmount: null }).creditReady).toBe(false);
    });
  });

  describe("mixed", () => {
    const mixed: ReadinessInput = {
      ...base,
      method: "MIXED",
      mixedCashAmount: 200,
      mixedDirectReceivedAmount: 200,
      mixedBank: "Banreservas",
      mixedReference: "REF-1",
    };

    it("is ready when the cash part is covered and the remainder is a valid transfer", () => {
      expect(paymentReadiness(mixed).mixedReady).toBe(true);
    });

    it("rejects a cash part of zero or the entire sale, which are not mixed payments", () => {
      expect(paymentReadiness({ ...mixed, mixedCashAmount: 0 }).mixedReady).toBe(false);
      expect(paymentReadiness({ ...mixed, mixedCashAmount: 500, mixedDirectReceivedAmount: 500 }).mixedReady).toBe(false);
    });

    it("checks the remainder against the credit limit when the second method is credit", () => {
      const onCredit = {
        ...mixed,
        mixedSecondMethod: "CREDIT" as const,
        creditEligible: true,
      };

      // 500 total - 200 cash leaves 300 on credit.
      expect(paymentReadiness({ ...onCredit, creditAvailableAmount: 300 }).mixedReady).toBe(true);
      expect(paymentReadiness({ ...onCredit, creditAvailableAmount: 299 }).mixedReady).toBe(false);
    });
  });

  describe("rentals", () => {
    it("needs a customer and a return date before a rental can be confirmed", () => {
      const rental = { ...base, hasRentalItems: true, directReceivedAmount: 500 };

      expect(paymentReadiness(rental).rentalReady).toBe(false);
      expect(paymentReadiness({ ...rental, hasCustomer: true }).rentalReady).toBe(false);
      expect(
        paymentReadiness({ ...rental, hasCustomer: true, rentalReturnAt: "2026-08-01T10:00" }).rentalReady
      ).toBe(true);
    });
  });

  describe("canConfirm", () => {
    it("needs a payable total", () => {
      expect(paymentReadiness({ ...base, total: 0, directReceivedAmount: 0 }).canConfirm).toBe(false);
    });

    it("needs at least one payment method to be ready", () => {
      expect(paymentReadiness(base).canConfirm).toBe(false);
      expect(paymentReadiness({ ...base, directReceivedAmount: 500 }).canConfirm).toBe(true);
    });

    it("stays blocked while a rental is missing its return date, even when paid", () => {
      const paidRental = {
        ...base,
        directReceivedAmount: 500,
        hasRentalItems: true,
        hasCustomer: true,
      };

      expect(paymentReadiness(paidRental).cashReady).toBe(true);
      expect(paymentReadiness(paidRental).canConfirm).toBe(false);
    });
  });
});
