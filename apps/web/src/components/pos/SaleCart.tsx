"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
      <CardHeader>
        <CardTitle>Carrito</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {resolved.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin productos agregados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2">Producto</th>
                <th className="py-2">Cant.</th>
                <th className="py-2">Mayoreo</th>
                <th className="py-2">Total</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {resolved.map((r) => (
                <tr key={r.line.productId} className="border-b border-border">
                  <td className="py-2">{r.product.description}</td>
                  <td className="py-2">
                    <Input
                      type="number"
                      min={1}
                      value={r.line.quantity}
                      onChange={(e) => onUpdateQuantity(r.line.productId, Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="h-8 w-16"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={r.line.useWholesalePrice}
                      onChange={() => onToggleWholesale(r.line.productId)}
                    />
                  </td>
                  <td className="py-2">RD${r.lineTotal.toFixed(2)}</td>
                  <td className="py-2">
                    <Button variant="ghost" size="sm" onClick={() => onRemove(r.line.productId)}>
                      Quitar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>RD${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Impuesto</span>
            <span>RD${tax.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Descuento</span>
              <span>-RD${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>RD${total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
