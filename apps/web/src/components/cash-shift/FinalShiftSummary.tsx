"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";
import type { CashShiftSummaryResponse } from "@/types/cash-shift";
import type { ProductResponse } from "@/types/product";

async function fetchProducts(): Promise<ProductResponse[]> {
  const res = await api.get<{ data: ProductResponse[] }>("/api/products");
  return res.data.data;
}

export function FinalShiftSummary({
  shift,
  onDone,
}: {
  shift: CashShiftSummaryResponse;
  onDone: () => void;
}) {
  const difference = Number(shift.cashDifference ?? "0");
  const isExact = difference === 0;

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    enabled: shift.inventoryCounts.length > 0,
  });
  const productById = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p.description])),
    [products]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Turno cerrado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-4",
            isExact ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"
          )}
        >
          {isExact ? (
            <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
          ) : (
            <AlertTriangle className="h-6 w-6 shrink-0 text-warning" />
          )}
          <div>
            <p className={cn("font-display text-base font-semibold", isExact ? "text-success" : "text-warning")}>
              {isExact ? "Caja cuadrada" : difference > 0 ? "Sobrante de caja" : "Faltante de caja"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isExact
                ? "El efectivo contado coincide con lo esperado."
                : `Diferencia de RD$${Math.abs(difference).toFixed(2)}. Revisa las notas del cierre.`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Efectivo esperado</p>
            <p className="font-mono-money font-semibold">RD${shift.expectedCash}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Efectivo contado</p>
            <p className="font-mono-money font-semibold">RD${shift.countedCash}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Diferencia</p>
            <p className={cn("font-mono-money font-semibold", isExact ? "text-success" : "text-warning")}>
              RD${shift.cashDifference}
            </p>
          </div>
        </div>

        {shift.inventoryCounts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Conteo de inventario</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1">Producto</th>
                  <th className="py-1 text-right">Apertura</th>
                  <th className="py-1 text-right">Esperado</th>
                  <th className="py-1 text-right">Contado</th>
                  <th className="py-1 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {shift.inventoryCounts.map((count) => {
                  const diff = (count.closingQuantity ?? 0) - (count.expectedQuantity ?? 0);
                  return (
                    <tr key={count.productId} className="border-b border-border">
                      <td className="py-1">{productById.get(count.productId) ?? count.productId}</td>
                      <td className="py-1 text-right">{count.openingQuantity}</td>
                      <td className="py-1 text-right">{count.expectedQuantity ?? "—"}</td>
                      <td className="py-1 text-right">{count.closingQuantity ?? "—"}</td>
                      <td className={cn("py-1 text-right", diff === 0 ? "text-success" : "text-warning")}>
                        {diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Button onClick={onDone}>Volver</Button>
      </CardContent>
    </Card>
  );
}
