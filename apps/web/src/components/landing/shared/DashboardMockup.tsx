import { DollarSign, PackageX, Wallet, TrendingUp } from "lucide-react";
import { MetricMockupCard } from "./MetricMockupCard";

export function DashboardMockup() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-4 shadow-[var(--shadow-elevated)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-semibold text-foreground">Dashboard - Hoy</p>
          <p className="text-xs text-muted-foreground">Repostería Dulce Encanto</p>
        </div>
        <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">Caja abierta</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricMockupCard icon={DollarSign} label="Ventas de hoy" value="RD$18,450" trend="+12% vs ayer" tone="success" />
        <MetricMockupCard icon={Wallet} label="Efectivo en caja" value="RD$11,250" tone="info" />
        <MetricMockupCard icon={PackageX} label="Productos bajos" value="3 items" tone="warning" />
        <MetricMockupCard icon={TrendingUp} label="Ticket promedio" value="RD$520" tone="default" />
      </div>
    </div>
  );
}
