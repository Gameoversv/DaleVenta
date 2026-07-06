import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricMockupCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  tone?: "default" | "success" | "warning" | "info";
  className?: string;
}

const toneClasses: Record<NonNullable<MetricMockupCardProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
};

export function MetricMockupCard({ icon: Icon, label, value, trend, tone = "default", className }: MetricMockupCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", toneClasses[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 font-mono-money font-display text-xl font-bold text-foreground">{value}</p>
      {trend && <p className="mt-1 text-xs text-success">{trend}</p>}
    </div>
  );
}
