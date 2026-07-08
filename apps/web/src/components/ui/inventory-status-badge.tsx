import { cn } from "@/lib/utils";

interface InventoryStatusBadgeProps {
  currentStock: number;
  minStock: number | null;
}

export function InventoryStatusBadge({ currentStock, minStock }: InventoryStatusBadgeProps) {
  if (currentStock <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
        Agotado
      </span>
    );
  }
  if (minStock != null && currentStock < minStock) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
        Stock bajo
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success")}>
      Disponible
    </span>
  );
}
