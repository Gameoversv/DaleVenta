import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RentalContractFieldsProps {
  hasCustomer: boolean;
  returnAt: string;
  onReturnAtChange: (value: string) => void;
  deposit: string;
  onDepositChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
}

/** The contract terms a rental needs before the sale that creates it can be sent. */
export function RentalContractFields({
  hasCustomer,
  returnAt,
  onReturnAtChange,
  deposit,
  onDepositChange,
  notes,
  onNotesChange,
}: Readonly<RentalContractFieldsProps>) {
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium">Contrato de alquiler</p>
        <p className="text-xs text-muted-foreground">Se creara un contrato activo ligado a esta factura.</p>
      </div>
      {!hasCustomer && <p className="text-sm text-destructive">Selecciona un cliente para facturar alquileres.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rental-return-at">Devolucion esperada</Label>
          <Input
            id="rental-return-at"
            type="datetime-local"
            value={returnAt}
            onChange={(event) => onReturnAtChange(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rental-deposit">Deposito</Label>
          <Input
            id="rental-deposit"
            type="number"
            min="0"
            step="0.01"
            value={deposit}
            onChange={(event) => onDepositChange(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rental-notes">Notas</Label>
        <Input id="rental-notes" value={notes} onChange={(event) => onNotesChange(event.target.value)} />
      </div>
    </div>
  );
}
