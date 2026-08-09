import { Banknote, Landmark, Split, Wallet2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethodTab = "CASH" | "TRANSFER" | "MIXED" | "CREDIT";

const TILES: Array<{ id: PaymentMethodTab; label: string; icon: typeof Banknote; activeClass: string }> = [
  { id: "CASH", label: "Efectivo", icon: Banknote, activeClass: "border-cash bg-cash/10 text-cash" },
  { id: "TRANSFER", label: "Transferencia", icon: Landmark, activeClass: "border-transfer bg-transfer/10 text-transfer" },
  { id: "MIXED", label: "Mixto", icon: Split, activeClass: "border-info bg-info/10 text-info" },
  { id: "CREDIT", label: "Credito", icon: Wallet2, activeClass: "border-credit bg-credit/10 text-credit" },
];

interface PaymentMethodTilesProps {
  method: PaymentMethodTab;
  canAuthorizeCredit: boolean;
  hasCustomer: boolean;
  onSelect: (method: PaymentMethodTab) => void;
}

/**
 * Why the credit tile is closed, phrased for whoever is standing at the register.
 *
 * Returns undefined when nothing blocks it, which is what the `title` attribute wants: an empty
 * string would still open a tooltip, only a blank one.
 */
function creditBlockReason(canAuthorizeCredit: boolean, hasCustomer: boolean): string | undefined {
  if (!canAuthorizeCredit) return "Tu usuario no tiene permiso para vender a credito";
  if (!hasCustomer) return "Selecciona un cliente para vender a credito";
  return undefined;
}

/** The four ways a sale can be paid, as one row of tiles. */
export function PaymentMethodTiles({
  method,
  canAuthorizeCredit,
  hasCustomer,
  onSelect,
}: Readonly<PaymentMethodTilesProps>) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TILES.map((tile) => {
        const Icon = tile.icon;
        const blockReason = tile.id === "CREDIT" ? creditBlockReason(canAuthorizeCredit, hasCustomer) : undefined;
        return (
          <button
            key={tile.id}
            type="button"
            disabled={blockReason !== undefined}
            title={blockReason}
            onClick={() => onSelect(tile.id)}
            className={cn(
              "flex min-h-20 flex-col items-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40",
              method === tile.id ? tile.activeClass : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            <Icon className="h-5 w-5" />
            {tile.label}
          </button>
        );
      })}
    </div>
  );
}
