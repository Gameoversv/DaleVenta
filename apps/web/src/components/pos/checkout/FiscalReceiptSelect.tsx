import { Label } from "@/components/ui/label";
import type { FiscalReceiptSequence, FiscalReceiptType } from "@/types/fiscal";

interface FiscalReceiptSelectProps {
  value: FiscalReceiptType | "";
  onChange: (value: FiscalReceiptType | "") => void;
  sequences: FiscalReceiptSequence[];
}

/** A sequence can only be picked while it is active and still has numbers left in it. */
function usable(sequence: FiscalReceiptSequence): boolean {
  return sequence.active && sequence.remaining > 0;
}

/** Which fiscal receipt, if any, this sale should be numbered under. */
export function FiscalReceiptSelect({ value, onChange, sequences }: Readonly<FiscalReceiptSelectProps>) {
  const available = sequences.filter(usable);

  return (
    <div className="space-y-2">
      <Label htmlFor="fiscal-receipt-type">Comprobante fiscal</Label>
      <select
        id="fiscal-receipt-type"
        value={value}
        onChange={(event) => onChange(event.target.value as FiscalReceiptType | "")}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Factura normal</option>
        {available.map((sequence) => (
          <option key={sequence.id} value={sequence.receiptType}>
            {sequence.receiptType} - proximo {sequence.nextNcf}
          </option>
        ))}
      </select>
      {available.length === 0 && (
        <p className="text-xs text-muted-foreground">No hay secuencias NCF activas disponibles.</p>
      )}
    </div>
  );
}
