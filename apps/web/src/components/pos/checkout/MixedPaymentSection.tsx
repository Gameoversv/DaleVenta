import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CashReceivedFields } from "./CashReceivedFields";
import { TransferFields } from "./TransferFields";
import { CreditSummary } from "./CreditSummary";
import type { DenominationCountEntry, DenominationResponse } from "@/types/cash-shift";
import type { ChangeSuggestionResponse } from "@/types/sale";
import type { CreditAccountResponse, CreditProfileResponse } from "@/types/credit";
import { money } from "@/lib/money";

export type MixedSecondMethod = "TRANSFER" | "CREDIT";

interface MixedPaymentSectionProps {
  total: number;
  cashAmountInput: string;
  onCashAmountInputChange: (value: string) => void;
  cashAmount: number;
  remainingAmount: number;
  secondMethod: MixedSecondMethod;
  onSecondMethodChange: (method: MixedSecondMethod) => void;

  cashDenominationsEnabled: boolean;
  denominations: DenominationResponse[] | undefined;
  receivedEntries: DenominationCountEntry[];
  onReceivedEntriesChange: (entries: DenominationCountEntry[]) => void;
  receivedTotal: number;
  changeAmountCents: number;
  suggestion: ChangeSuggestionResponse | undefined;
  receivedAmountInput: string;
  onReceivedAmountInputChange: (value: string) => void;
  directChangeAmount: number;

  bank: string;
  reference: string;
  onBankChange: (value: string) => void;
  onReferenceChange: (value: string) => void;

  canAuthorizeCredit: boolean;
  hasCustomer: boolean;
  creditProfile: CreditProfileResponse | undefined;
  creditAccount: CreditAccountResponse | undefined;
  creditEligible: boolean;
  creditAvailable: number | null;
  creditWithinLimit: boolean;
}

/**
 * Part cash, remainder on a second method.
 *
 * The cash split has to be settled before anything else is worth asking: until the register
 * knows how much of the total is coming in cash there is no remainder to put on a transfer or a
 * credit line, so the rest of the form stays out of the way.
 */
export function MixedPaymentSection({
  total,
  cashAmountInput,
  onCashAmountInputChange,
  cashAmount,
  remainingAmount,
  secondMethod,
  onSecondMethodChange,
  cashDenominationsEnabled,
  denominations,
  receivedEntries,
  onReceivedEntriesChange,
  receivedTotal,
  changeAmountCents,
  suggestion,
  receivedAmountInput,
  onReceivedAmountInputChange,
  directChangeAmount,
  bank,
  reference,
  onBankChange,
  onReferenceChange,
  canAuthorizeCredit,
  hasCustomer,
  creditProfile,
  creditAccount,
  creditEligible,
  creditAvailable,
  creditWithinLimit,
}: Readonly<MixedPaymentSectionProps>) {
  const splitSettled = cashAmount > 0 && cashAmount < total;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mixed-cash-amount">Monto en efectivo</Label>
          <Input
            id="mixed-cash-amount"
            type="number"
            min="0.01"
            max={total}
            step="0.01"
            value={cashAmountInput}
            onChange={(event) => onCashAmountInputChange(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mixed-second-method">Restante en</Label>
          <select
            id="mixed-second-method"
            value={secondMethod}
            onChange={(event) => onSecondMethodChange(event.target.value as MixedSecondMethod)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="TRANSFER">Transferencia</option>
            <option value="CREDIT" disabled={!canAuthorizeCredit}>
              Credito
            </option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">
          {secondMethod === "TRANSFER" ? "Monto por transferencia" : "Monto a credito"}
        </p>
        <p className="font-mono-money text-lg font-bold">{money(remainingAmount)}</p>
      </div>

      {cashAmount <= 0 && <p className="text-sm text-muted-foreground">Indica cuanto pagara en efectivo.</p>}
      {cashAmount >= total && total > 0 && (
        <p className="text-sm text-destructive">El efectivo debe ser menor que el total para usar pago mixto.</p>
      )}

      {splitSettled && (
        <>
          <CashReceivedFields
            inputId="mixed-received-amount"
            inputLabel="Recibido en efectivo"
            countedLabel="Recibido efectivo"
            insufficientMessage="Recibido insuficiente para cubrir la parte en efectivo."
            denominationsEnabled={cashDenominationsEnabled}
            denominations={denominations}
            entries={receivedEntries}
            onEntriesChange={onReceivedEntriesChange}
            receivedTotal={receivedTotal}
            changeAmountCents={changeAmountCents}
            suggestion={suggestion}
            amountInput={receivedAmountInput}
            onAmountInputChange={onReceivedAmountInputChange}
            directChangeAmount={directChangeAmount}
          />

          {secondMethod === "TRANSFER" ? (
            <TransferFields
              idPrefix="mixed-transfer"
              bank={bank}
              reference={reference}
              onBankChange={onBankChange}
              onReferenceChange={onReferenceChange}
              className="grid gap-3 sm:grid-cols-2"
            />
          ) : (
            <CreditSummary
              canAuthorizeCredit={canAuthorizeCredit}
              hasCustomer={hasCustomer}
              creditProfile={creditProfile}
              creditAccount={creditAccount}
              creditEligible={creditEligible}
              creditAvailable={creditAvailable}
              withinLimit={creditWithinLimit}
              overLimitMessage="La parte a credito excede el disponible."
              className="space-y-2 rounded-md border border-border p-3"
            />
          )}
        </>
      )}
    </div>
  );
}
