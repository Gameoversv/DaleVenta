import { Badge } from "@/components/ui/badge";

const cartItems = [
  { name: "Bizcocho de chocolate", qty: 1, price: "RD$950" },
  { name: "Cupcakes (x6)", qty: 2, price: "RD$1,200" },
  { name: "Flan de queso", qty: 1, price: "RD$380" },
];

export function POSMockup() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elevated)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-sm font-semibold text-foreground">Punto de venta</p>
        <Badge variant="info">Cliente: Ana Ramírez</Badge>
      </div>
      <div className="space-y-2">
        {cartItems.map((item) => (
          <div key={item.name} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="text-foreground">
              {item.qty}x {item.name}
            </span>
            <span className="font-mono-money text-muted-foreground">{item.price}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="font-display text-sm font-semibold text-foreground">Total</span>
        <span className="font-mono-money font-display text-lg font-bold text-foreground">RD$2,530</span>
      </div>
      <div className="mt-3 flex gap-2">
        <Badge variant="success">Efectivo</Badge>
        <Badge variant="credit">Crédito</Badge>
      </div>
    </div>
  );
}
