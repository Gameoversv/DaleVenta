"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { Button } from "@/components/ui/button";
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
  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory", branchId],
    queryFn: () => fetchInventory(branchId),
  });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const productName = (productId: string) => products?.find((p) => p.id === productId)?.description ?? productId;

  return (
    <div className="space-y-4">
      {canAdjust && products && (
        <div className="flex justify-end">
          <AdjustStockDialog
            branchId={branchId}
            products={products}
            trigger={<Button size="sm">Ajustar stock</Button>}
          />
        </div>
      )}
      {isLoading && <p className="text-muted-foreground">Cargando inventario...</p>}
      {inventory && inventory.length === 0 && (
        <p className="text-muted-foreground">Esta sucursal no tiene productos con inventario registrado.</p>
      )}
      {inventory && inventory.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2">Producto</th>
              <th className="py-2">Stock actual</th>
              <th className="py-2">Minimo</th>
              <th className="py-2">Maximo</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr
                key={item.productId}
                className={cn("border-b border-border", item.currentStock < item.minStock && "bg-amber-500/10")}
              >
                <td className="py-2">{productName(item.productId)}</td>
                <td className="py-2">{item.currentStock}</td>
                <td className="py-2">{item.minStock}</td>
                <td className="py-2">{item.maxStock ?? "—"}</td>
                <td className="py-2 text-right">
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
      )}
    </div>
  );
}
