import { Banknote, Landmark, Wallet2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentMethod = "CASH" | "TRANSFER" | "CREDIT";

const CONFIG: Record<PaymentMethod, { label: string; icon: typeof Banknote; className: string }> = {
  CASH: { label: "Efectivo", icon: Banknote, className: "bg-cash/10 text-cash" },
  TRANSFER: { label: "Transferencia", icon: Landmark, className: "bg-transfer/10 text-transfer" },
  CREDIT: { label: "Credito", icon: Wallet2, className: "bg-credit/10 text-credit" },
};

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  const cfg = CONFIG[method];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}
