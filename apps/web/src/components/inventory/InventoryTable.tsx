"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InventoryStatusBadge } from "@/components/ui/inventory-status-badge";
import type { BranchInventoryResponse, ProductResponse } from "@/types/product";

async function fetchInventory(branchId: string): Promise<BranchInventoryResponse[]> {
  const res = await api.get<{ data: BranchInventoryResponse[] }>(`/api/inventory/branch/${branchId}`);
  return res.data.data;
}

async function fetchProducts(): Promise<ProductResponse[]> {
  const res = await api.get<{ data: ProductResponse[] }>("/api/products");
  return res.data.data;
}

export function InventoryTable({ branchId }: { branchId: string }) {
  const canAdjust = usePermission("INVENTORY_ADJUST");
  const [query, setQuery] = useState("");
  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory", branchId],
    queryFn: () => fetchInventory(branchId),
  });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const productName = (productId: string) => products?.find((p) => p.id === productId)?.description ?? productId;

  const filtered = useMemo(() => {
    if (!inventory) return [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return inventory;
    return inventory.filter((item) => productName(item.productId).toLowerCase().includes(normalized));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory, products, query]);

  const lowOrOutCount = (inventory ?? []).filter((i) => i.currentStock < i.minStock).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {canAdjust && products && (
          <AdjustStockDialog
            branchId={branchId}
            products={products}
            trigger={<Button size="sm">Ajustar stock</Button>}
          />
        )}
      </div>

      {lowOrOutCount > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5 text-sm text-warning">
          {lowOrOutCount} producto{lowOrOutCount === 1 ? "" : "s"} por debajo del minimo o agotado{lowOrOutCount === 1 ? "" : "s"}.
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Cargando inventario...</p>}
          {inventory && inventory.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">
              Esta sucursal aun no tiene productos con inventario registrado.
            </p>
          )}
          {filtered.length === 0 && inventory && inventory.length > 0 && (
            <p className="p-6 text-sm text-muted-foreground">Ningun producto coincide con la busqueda.</p>
          )}
          {filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 text-right">Stock actual</th>
                    <th className="px-4 py-3 text-right">Minimo</th>
                    <th className="px-4 py-3 text-right">Maximo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.productId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{productName(item.productId)}</td>
                      <td className="px-4 py-3 text-right font-mono-money">{item.currentStock}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.minStock}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.maxStock ?? "-"}</td>
                      <td className="px-4 py-3">
                        <InventoryStatusBadge currentStock={item.currentStock} minStock={item.minStock} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canAdjust && (
                          <AdjustStockDialog
                            branchId={branchId}
                            productId={item.productId}
                            productName={productName(item.productId)}
                            trigger={
                              <Button variant="ghost" size="sm" aria-label={`Ajustar stock de ${productName(item.productId)}`}>
                                Ajustar
                              </Button>
                            }
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
