import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TransferFieldsProps {
  /** Distinguishes the standalone transfer from the one inside a mixed payment. */
  idPrefix: string;
  bank: string;
  reference: string;
  onBankChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
  /** Layout of the pair, which sits stacked on its own tab and side by side inside a mixed one. */
  className?: string;
}

/** Bank and reference, the two things a transfer has to carry before it can be recorded. */
export function TransferFields({
  idPrefix,
  bank,
  reference,
  onBankChange,
  onReferenceChange,
  className = "space-y-3",
}: Readonly<TransferFieldsProps>) {
  return (
    <div className={className}>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-bank`}>Banco</Label>
        <Input id={`${idPrefix}-bank`} value={bank} onChange={(event) => onBankChange(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-reference`}>Referencia</Label>
        <Input
          id={`${idPrefix}-reference`}
          value={reference}
          onChange={(event) => onReferenceChange(event.target.value)}
        />
      </div>
    </div>
  );
}
