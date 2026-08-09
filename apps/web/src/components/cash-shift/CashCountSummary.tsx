import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/money";

interface CashCountSummaryProps {
  /** What the shift says should be in the drawer. */
  expectedCash: number;
  /** What the cashier counted, however they counted it. */
  countedCash: number;
  /** Whether they have counted anything yet; nothing is judged before they have. */
  hasCounted: boolean;
}

function frameTone(hasCounted: boolean, isSquare: boolean): string {
  if (!hasCounted) return "border-border";
  return isSquare ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5";
}

/** What a difference means to whoever has to explain it. */
function verdict(difference: number): string {
  if (difference === 0) return "Caja cuadrada";
  return difference > 0 ? "Sobrante" : "Faltante";
}

/**
 * Expected against counted, and what the gap between them is called.
 *
 * The verdict is kept in one place because it is the number the shift is judged on: a shortfall
 * and a surplus are different conversations, and the sign is the only thing telling them apart.
 */
export function CashCountSummary({ expectedCash, countedCash, hasCounted }: Readonly<CashCountSummaryProps>) {
  const difference = countedCash - expectedCash;
  const isSquare = difference === 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">Efectivo esperado</p>
        <p className="font-mono-money text-lg font-bold">{money(expectedCash)}</p>
      </div>
      <div className="rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">Efectivo contado</p>
        <p className="font-mono-money text-lg font-bold">{hasCounted ? money(countedCash) : "-"}</p>
      </div>
      <div className={cn("col-span-2 rounded-lg border p-3 sm:col-span-2", frameTone(hasCounted, isSquare))}>
        <p className="text-xs text-muted-foreground">Diferencia</p>
        <div className="flex items-center gap-1.5">
          {hasCounted && isSquare && <CheckCircle2 className="h-4 w-4 text-success" />}
          {hasCounted && !isSquare && <AlertTriangle className="h-4 w-4 text-warning" />}
          <p
            className={cn(
              "font-mono-money text-lg font-bold",
              hasCounted && (isSquare ? "text-success" : "text-warning")
            )}
          >
            {hasCounted ? money(difference) : "-"}
          </p>
        </div>
        {hasCounted && <p className="text-xs text-muted-foreground">{verdict(difference)}</p>}
      </div>
    </div>
  );
}
