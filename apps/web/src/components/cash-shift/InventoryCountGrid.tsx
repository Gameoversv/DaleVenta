"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InventoryCountEntry } from "@/types/cash-shift";
import type { BranchInventoryResponse, ProductResponse } from "@/types/product";

async function fetchBranchInventory(branchId: string): Promise<BranchInventoryResponse[]> {
  const res = await api.get<{ data: BranchInventoryResponse[] }>(`/api/inventory/branch/${branchId}`);
  return res.data.data;
}

async function fetchProducts(): Promise<ProductResponse[]> {
  const res = await api.get<{ data: ProductResponse[] }>("/api/products");
  return res.data.data;
}

interface InventoryCountGridProps {
  branchId: string;
  onChange: (entries: InventoryCountEntry[]) => void;
}

export function InventoryCountGrid({ branchId, onChange }: InventoryCountGridProps) {
  const { data: inventory, isLoading, isError } = useQuery({
    queryKey: ["branch-inventory", branchId],
    queryFn: () => fetchBranchInventory(branchId),
    enabled: !!branchId,
  });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const productById = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p])),
    [products]
  );

  const trackedRows = useMemo(
    () => (inventory ?? []).filter((row) => productById.get(row.productId)?.tracksInventory !== false),
    [inventory, productById]
  );

  useEffect(() => {
    if (trackedRows.length === 0) return;
    setQuantities((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const row of trackedRows) {
        if (!(row.productId in next)) {
          next[row.productId] = row.currentStock;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedRows.length]);

  useEffect(() => {
    onChange(Object.entries(quantities).map(([productId, quantity]) => ({ productId, quantity })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantities]);

  const handleChange = (productId: string, rawValue: string) => {
    const quantity = Math.max(0, parseInt(rawValue, 10) || 0);
    setQuantities((prev) => ({ ...prev, [productId]: quantity }));
  };

  if (!branchId) return null;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando inventario...</p>;
  }

  if (isError) {
    return <p className="text-sm text-destructive">No se pudo cargar el inventario de la sucursal.</p>;
  }

  if (trackedRows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta sucursal no tiene productos con control de inventario.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Conteo de inventario</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {trackedRows.map((row) => {
          const product = productById.get(row.productId);
          return (
            <div key={row.productId} className="space-y-1">
              <Label htmlFor={`inv-${row.productId}`}>
                {product?.description ?? row.productId} ({product?.unit ?? "u"})
              </Label>
              <Input
                id={`inv-${row.productId}`}
                type="number"
                min={0}
                value={quantities[row.productId] ?? row.currentStock}
                onChange={(e) => handleChange(row.productId, e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
