"use client";

import { Minus, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { productUnitLabel } from "@/lib/product-units";
import type { ProductResponse } from "@/types/product";
import type { CartLine } from "./cart";

interface ResolvedLine {
  line: CartLine;
  product: ProductResponse;
  unitPrice: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

export function resolveCart(cart: CartLine[], products: ProductResponse[]): ResolvedLine[] {
  return cart
    .map((line) => {
      const product = products.find((p) => p.id === line.productId);
      if (!product) return null;
      const unitPrice = Number(line.useWholesalePrice ? product.wholesalePrice : product.salePrice) || 0;
      const taxRate = Number(product.taxRate) || 0;
      const lineSubtotal = unitPrice * line.quantity;
      const lineTax = lineSubtotal * (taxRate / 100);
      return { line, product, unitPrice, lineSubtotal, lineTax, lineTotal: lineSubtotal + lineTax };
    })
    .filter((r): r is ResolvedLine => r !== null);
}

interface SaleCartProps {
  cart: CartLine[];
  products: ProductResponse[];
  discountAmount: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onToggleWholesale: (productId: string) => void;
  onRemove: (productId: string) => void;
}

export function SaleCart({ cart, products, discountAmount, onUpdateQuantity, onToggleWholesale, onRemove }: SaleCartProps) {
  const resolved = resolveCart(cart, products);
  const subtotal = resolved.reduce((sum, r) => sum + r.lineSubtotal, 0);
  const tax = resolved.reduce((sum, r) => sum + r.lineTax, 0);
  const total = Math.max(0, subtotal + tax - discountAmount);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Carrito</CardTitle>
        {resolved.length > 0 && (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {resolved.length} producto{resolved.length === 1 ? "" : "s"}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {resolved.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin productos agregados todavia.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {resolved.map((r) => (
              <li key={r.line.productId} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.product.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      RD${r.unitPrice.toFixed(2)} / {productUnitLabel(r.product.unit)}
                    </p>
                    <label className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={r.line.useWholesalePrice}
                        onChange={() => onToggleWholesale(r.line.productId)}
                        className="h-3.5 w-3.5"
                      />
                      Precio mayoreo
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-money whitespace-nowrap text-sm font-bold">RD${r.lineTotal.toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(r.line.productId)}
                      aria-label={`Quitar ${r.product.description}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(r.line.productId, Math.max(1, r.line.quantity - 1))}
                    aria-label="Reducir cantidad"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="min-w-16 text-center text-sm font-medium">
                    {r.line.quantity} {productUnitLabel(r.product.unit)}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(r.line.productId, r.line.quantity + 1)}
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono-money">RD${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Impuesto</span>
            <span className="font-mono-money">RD${tax.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Descuento</span>
              <span className="font-mono-money text-warning">-RD${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <span className="font-display text-base font-semibold">Total</span>
            <span className="font-mono-money font-display text-3xl font-extrabold text-primary">
              RD${total.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
