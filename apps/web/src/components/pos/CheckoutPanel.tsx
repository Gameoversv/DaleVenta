"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { useDenominations } from "@/hooks/useDenominations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CashReceivedFields } from "@/components/pos/checkout/CashReceivedFields";
import { CreditSummary } from "@/components/pos/checkout/CreditSummary";
import { FiscalReceiptSelect } from "@/components/pos/checkout/FiscalReceiptSelect";
import { MixedPaymentSection, type MixedSecondMethod } from "@/components/pos/checkout/MixedPaymentSection";
import { PaymentMethodTiles, type PaymentMethodTab } from "@/components/pos/checkout/PaymentMethodTiles";
import { RentalContractFields } from "@/components/pos/checkout/RentalContractFields";
import { TransferFields } from "@/components/pos/checkout/TransferFields";
import type { DenominationCountEntry } from "@/types/cash-shift";
import type { ChangeSuggestionResponse, PaymentRequest, RentalDetailsRequest } from "@/types/sale";
import type { CustomerResponse } from "@/types/customer";
import type { CreditAccountResponse, CreditProfileResponse } from "@/types/credit";
import type { FiscalReceiptSequence, FiscalReceiptType } from "@/types/fiscal";
import { money } from "@/lib/money";
import {
  changeAmountCents as changeCents,
  checkoutTotals,
  creditAvailable as creditAvailableAmount,
  paymentPlan,
  paymentReadiness,
  sumDenominations,
} from "@/lib/checkout";

async function fetchChangeSuggestion(
  registerId: string,
  changeAmountCents: number,
  receivedDenominations: DenominationCountEntry[]
): Promise<ChangeSuggestionResponse> {
  const res = await api.post<{ data: ChangeSuggestionResponse }>("/api/cash-shifts/change-suggestion", {
    registerId,
    changeAmountCents,
    receivedDenominations,
  });
  return res.data.data;
}

async function fetchCreditProfile(customerId: string): Promise<CreditProfileResponse> {
  const res = await api.get<{ data: CreditProfileResponse }>(`/api/customers/${customerId}/credit-profile`);
  return res.data.data;
}

async function fetchCreditAccount(customerId: string): Promise<CreditAccountResponse> {
  const res = await api.get<{ data: CreditAccountResponse }>(`/api/customers/${customerId}/credit-account`);
  return res.data.data;
}

interface CheckoutPanelProps {
  registerId: string;
  customer: CustomerResponse | null;
  preDiscountTotal: number;
  disabled: boolean;
  isSubmitting: boolean;
  fiscalModuleEnabled: boolean;
  fiscalSequences: FiscalReceiptSequence[];
  cashDenominationsEnabled: boolean;
  hasRentalItems: boolean;
  onConfirm: (
    payments: PaymentRequest[],
    discountAmount: number,
    fiscalReceiptType?: FiscalReceiptType | null,
    rentalDetails?: RentalDetailsRequest
  ) => void;
}

/**
 * Owns the whole checkout form: the totals, what has been paid, and whether the sale may be sent.
 *
 * The four payment methods render from `checkout/`. Keeping their markup here is what grew this
 * component past any reading of it: the branches multiply (four methods, cash counted or typed,
 * a mixed payment that contains two of the others), while what the panel actually decides is one
 * question, answered in one place by `paymentReadiness`.
 */
export function CheckoutPanel({
  registerId,
  customer,
  preDiscountTotal,
  disabled,
  isSubmitting,
  fiscalModuleEnabled,
  fiscalSequences,
  cashDenominationsEnabled,
  hasRentalItems,
  onConfirm,
}: Readonly<CheckoutPanelProps>) {
  const canDiscount = usePermission("SALE_DISCOUNT");
  const canAuthorizeCredit = usePermission("CREDIT_AUTHORIZE");
  const [discountInput, setDiscountInput] = useState("");
  const [method, setMethod] = useState<PaymentMethodTab>("CASH");
  const [fiscalReceiptType, setFiscalReceiptType] = useState<FiscalReceiptType | "">("");
  const [receivedEntries, setReceivedEntries] = useState<DenominationCountEntry[]>([]);
  const [receivedAmountInput, setReceivedAmountInput] = useState("");
  const [mixedCashInput, setMixedCashInput] = useState("");
  const [mixedReceivedEntries, setMixedReceivedEntries] = useState<DenominationCountEntry[]>([]);
  const [mixedReceivedAmountInput, setMixedReceivedAmountInput] = useState("");
  const [mixedSecondMethod, setMixedSecondMethod] = useState<MixedSecondMethod>("CREDIT");
  const [bank, setBank] = useState("");
  const [reference, setReference] = useState("");
  const [mixedBank, setMixedBank] = useState("");
  const [mixedReference, setMixedReference] = useState("");
  const [rentalReturnAt, setRentalReturnAt] = useState("");
  const [rentalDeposit, setRentalDeposit] = useState("0");
  const [rentalNotes, setRentalNotes] = useState("");

  const { data: denominations } = useDenominations(cashDenominationsEnabled);

  const { discountAmount, saleTotal, rentalDepositAmount, total } = checkoutTotals({
    preDiscountTotal,
    discountInput,
    canDiscount,
    hasRentalItems,
    rentalDeposit,
  });
  const mixedCashAmount = Math.max(0, Number(mixedCashInput) || 0);
  const mixedRemainingAmount = Math.max(0, total - mixedCashAmount);
  const mixedTransferAmount = mixedSecondMethod === "TRANSFER" ? mixedRemainingAmount : 0;
  const mixedCreditAmount = mixedSecondMethod === "CREDIT" ? mixedRemainingAmount : 0;

  const receivedTotal = sumDenominations(receivedEntries, denominations);
  const mixedReceivedTotal = sumDenominations(mixedReceivedEntries, denominations);
  const directReceivedAmount = Math.max(0, Number(receivedAmountInput) || 0);
  const directChangeAmount = directReceivedAmount - total;
  const mixedDirectReceivedAmount = Math.max(0, Number(mixedReceivedAmountInput) || 0);
  const mixedDirectChangeAmount = mixedDirectReceivedAmount - mixedCashAmount;
  const changeAmountCents = changeCents(receivedTotal, total);
  const mixedChangeAmountCents = changeCents(mixedReceivedTotal, mixedCashAmount);

  const { data: suggestion } = useQuery({
    queryKey: ["change-suggestion", registerId, changeAmountCents, receivedEntries],
    queryFn: () => fetchChangeSuggestion(registerId, changeAmountCents, receivedEntries),
    enabled: cashDenominationsEnabled && method === "CASH" && changeAmountCents >= 0 && receivedEntries.length > 0 && total > 0,
  });

  const { data: mixedSuggestion } = useQuery({
    queryKey: ["mixed-change-suggestion", registerId, mixedChangeAmountCents, mixedReceivedEntries],
    queryFn: () => fetchChangeSuggestion(registerId, mixedChangeAmountCents, mixedReceivedEntries),
    enabled:
      cashDenominationsEnabled &&
      method === "MIXED" &&
      mixedCashAmount > 0 &&
      mixedChangeAmountCents >= 0 &&
      mixedReceivedEntries.length > 0,
  });

  const creditWanted = method === "CREDIT" || (method === "MIXED" && mixedSecondMethod === "CREDIT");

  const { data: creditProfile } = useQuery({
    queryKey: ["credit-profile", customer?.id],
    queryFn: () => fetchCreditProfile(customer!.id),
    enabled: creditWanted && !!customer,
  });

  const { data: creditAccount } = useQuery({
    queryKey: ["credit-account", customer?.id],
    queryFn: () => fetchCreditAccount(customer!.id),
    enabled: creditWanted && !!customer,
  });

  const creditAvailable = creditAvailableAmount(creditProfile, creditAccount);
  const creditEligible = canAuthorizeCredit && !!customer && creditProfile?.creditEnabled === true;

  const { canConfirm: rulesSatisfied } = paymentReadiness({
    method,
    total,
    cashDenominationsEnabled,
    changeCents: changeAmountCents,
    receivedEntryCount: receivedEntries.length,
    suggestionExact: suggestion?.exact === true,
    directReceivedAmount,
    bank,
    reference,
    mixedCashAmount,
    mixedSecondMethod,
    mixedChangeCents: mixedChangeAmountCents,
    mixedReceivedEntryCount: mixedReceivedEntries.length,
    mixedSuggestionExact: mixedSuggestion?.exact === true,
    mixedDirectReceivedAmount,
    mixedBank,
    mixedReference,
    creditEligible,
    creditAvailableAmount: creditAvailable,
    hasRentalItems,
    hasCustomer: customer != null,
    rentalReturnAt,
  });
  const canConfirm = !disabled && rulesSatisfied && !isSubmitting;

  // Only used to explain the block in the UI; paymentReadiness already enforces both.
  const creditWithinLimit = creditAvailable !== null && total <= creditAvailable;
  const mixedCreditWithinLimit = creditAvailable !== null && mixedRemainingAmount <= creditAvailable;

  const handleConfirm = () => {
    const payments = paymentPlan({
      method,
      total,
      cashDenominationsEnabled,
      receivedEntries,
      bank,
      reference,
      mixedSecondMethod,
      mixedCashAmount,
      mixedTransferAmount,
      mixedCreditAmount,
      mixedReceivedEntries,
      mixedBank,
      mixedReference,
    });
    const rentalDetails = hasRentalItems
      ? {
          expectedReturnAt: new Date(rentalReturnAt).toISOString(),
          depositAmount: rentalDeposit || "0",
          notes: rentalNotes.trim() || undefined,
        }
      : undefined;
    onConfirm(payments, discountAmount, fiscalReceiptType || null, rentalDetails);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cobro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canDiscount && (
          <div className="space-y-2">
            <Label htmlFor="sale-discount">Descuento</Label>
            <Input
              id="sale-discount"
              type="number"
              min={0}
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
            />
          </div>
        )}

        <div className="rounded-xl bg-primary/5 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total a cobrar</p>
          <p className="font-mono-money font-display text-4xl font-extrabold text-primary">{money(total)}</p>
          {hasRentalItems && (
            <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
              <span>Alquiler: {money(saleTotal)}</span>
              <span>Deposito: {money(rentalDepositAmount)}</span>
            </div>
          )}
        </div>

        {fiscalModuleEnabled && (
          <FiscalReceiptSelect
            value={fiscalReceiptType}
            onChange={setFiscalReceiptType}
            sequences={fiscalSequences}
          />
        )}

        {hasRentalItems && (
          <RentalContractFields
            hasCustomer={customer != null}
            returnAt={rentalReturnAt}
            onReturnAtChange={setRentalReturnAt}
            deposit={rentalDeposit}
            onDepositChange={setRentalDeposit}
            notes={rentalNotes}
            onNotesChange={setRentalNotes}
          />
        )}

        <PaymentMethodTiles
          method={method}
          canAuthorizeCredit={canAuthorizeCredit}
          hasCustomer={customer != null}
          onSelect={setMethod}
        />

        {method === "CASH" && (
          <CashReceivedFields
            inputId="cash-received-amount"
            inputLabel="Recibido"
            countedLabel="Recibido"
            insufficientMessage="Recibido insuficiente para cubrir el total."
            denominationsEnabled={cashDenominationsEnabled}
            denominations={denominations}
            entries={receivedEntries}
            onEntriesChange={setReceivedEntries}
            receivedTotal={receivedTotal}
            changeAmountCents={changeAmountCents}
            suggestion={suggestion}
            amountInput={receivedAmountInput}
            onAmountInputChange={setReceivedAmountInput}
            showChangeCombination
            directChangeAmount={directChangeAmount}
          />
        )}

        {method === "TRANSFER" && (
          <TransferFields
            idPrefix="transfer"
            bank={bank}
            reference={reference}
            onBankChange={setBank}
            onReferenceChange={setReference}
          />
        )}

        {method === "MIXED" && (
          <MixedPaymentSection
            total={total}
            cashAmountInput={mixedCashInput}
            onCashAmountInputChange={setMixedCashInput}
            cashAmount={mixedCashAmount}
            remainingAmount={mixedRemainingAmount}
            secondMethod={mixedSecondMethod}
            onSecondMethodChange={setMixedSecondMethod}
            cashDenominationsEnabled={cashDenominationsEnabled}
            denominations={denominations}
            receivedEntries={mixedReceivedEntries}
            onReceivedEntriesChange={setMixedReceivedEntries}
            receivedTotal={mixedReceivedTotal}
            changeAmountCents={mixedChangeAmountCents}
            suggestion={mixedSuggestion}
            receivedAmountInput={mixedReceivedAmountInput}
            onReceivedAmountInputChange={setMixedReceivedAmountInput}
            directChangeAmount={mixedDirectChangeAmount}
            bank={mixedBank}
            reference={mixedReference}
            onBankChange={setMixedBank}
            onReferenceChange={setMixedReference}
            canAuthorizeCredit={canAuthorizeCredit}
            hasCustomer={customer != null}
            creditProfile={creditProfile}
            creditAccount={creditAccount}
            creditEligible={creditEligible}
            creditAvailable={creditAvailable}
            creditWithinLimit={mixedCreditWithinLimit}
          />
        )}

        {method === "CREDIT" && (
          <CreditSummary
            canAuthorizeCredit={canAuthorizeCredit}
            hasCustomer={customer != null}
            creditProfile={creditProfile}
            creditAccount={creditAccount}
            creditEligible={creditEligible}
            creditAvailable={creditAvailable}
            withinLimit={creditWithinLimit}
            overLimitMessage="Excede el credito disponible."
          />
        )}

        <Button size="lg" className="w-full" variant="accent" disabled={!canConfirm} onClick={handleConfirm}>
          {isSubmitting ? "Cobrando..." : "Cobrar"}
        </Button>
      </CardContent>
    </Card>
  );
}
