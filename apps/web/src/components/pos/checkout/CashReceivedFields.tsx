import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DenominationCountGrid, formatDenominationValue } from "@/components/cash-shift/DenominationCountGrid";
import type { DenominationCountEntry, DenominationResponse } from "@/types/cash-shift";
import type { ChangeSuggestionResponse } from "@/types/sale";
import { money } from "@/lib/money";

interface CashReceivedFieldsProps {
  /** Id of the plain amount input, so its label stays attached on a screen with two of these. */
  inputId: string;
  /** Label for the plain amount input: what the cashier is being asked for. */
  inputLabel: string;
  /** Prefix for the counted total, which reads differently in a mixed payment. */
  countedLabel: string;
  /** Shown when what came in does not cover what this payment owes. */
  insufficientMessage: string;
  denominationsEnabled: boolean;
  denominations: DenominationResponse[] | undefined;
  entries: DenominationCountEntry[];
  onEntriesChange: (entries: DenominationCountEntry[]) => void;
  receivedTotal: number;
  changeAmountCents: number;
  suggestion: ChangeSuggestionResponse | undefined;
  amountInput: string;
  onAmountInputChange: (value: string) => void;
  /** Whether to spell out which notes the drawer would hand back. Only the cash tab does. */
  showChangeCombination?: boolean;
  /** Difference between the typed amount and what is owed, negative when it falls short. */
  directChangeAmount: number;
}

function combinationText(
  suggestion: ChangeSuggestionResponse,
  denominations: DenominationResponse[] | undefined
): string {
  return suggestion.combination
    .map((line) => {
      const denomination = denominations?.find((candidate) => candidate.id === line.denominationId);
      const value = denomination ? formatDenominationValue(denomination.value) : line.denominationId;
      return `${line.quantity} x ${value}`;
    })
    .join(", ");
}

/**
 * How cash comes in, either counted note by note or typed as one amount.
 *
 * The two shapes are one component because the sale is blocked by the same question in both:
 * does what the customer handed over cover this payment, and can the drawer make the change.
 */
export function CashReceivedFields({
  inputId,
  inputLabel,
  countedLabel,
  insufficientMessage,
  denominationsEnabled,
  denominations,
  entries,
  onEntriesChange,
  receivedTotal,
  changeAmountCents,
  suggestion,
  amountInput,
  onAmountInputChange,
  showChangeCombination = false,
  directChangeAmount,
}: Readonly<CashReceivedFieldsProps>) {
  if (!denominationsEnabled) {
    return (
      <div className="space-y-2">
        <Label htmlFor={inputId}>{inputLabel}</Label>
        <Input
          id={inputId}
          type="number"
          min="0"
          step="0.01"
          value={amountInput}
          onChange={(event) => onAmountInputChange(event.target.value)}
        />
        {amountInput.trim() !== "" && (
          <p className={cn("text-sm", directChangeAmount < 0 ? "text-destructive" : "text-muted-foreground")}>
            {directChangeAmount < 0 ? insufficientMessage : `Cambio: ${money(directChangeAmount)}`}
          </p>
        )}
      </div>
    );
  }

  const counted = entries.length > 0;
  return (
    <div className="space-y-3">
      <DenominationCountGrid onChange={onEntriesChange} />
      {counted && (
        <p className="text-sm text-muted-foreground">
          {countedLabel}: {money(receivedTotal)}
          {changeAmountCents >= 0 && ` · Cambio: ${money(changeAmountCents / 100)}`}
        </p>
      )}
      {counted && changeAmountCents < 0 && <p className="text-sm text-destructive">{insufficientMessage}</p>}
      {counted && changeAmountCents >= 0 && suggestion && !suggestion.exact && (
        <p className="text-sm text-destructive">No hay combinacion exacta de cambio disponible.</p>
      )}
      {showChangeCombination && suggestion?.exact && suggestion.combination.length > 0 && (
        <p className="text-xs text-muted-foreground">Cambio en: {combinationText(suggestion, denominations)}</p>
      )}
    </div>
  );
}
