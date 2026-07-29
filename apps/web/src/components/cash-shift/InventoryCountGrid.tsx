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
  const [search, setSearch] = useState("");

  const productById = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p])),
    [products]
  );

  const trackedRows = useMemo(
    () => (inventory ?? []).filter((row) => productById.get(row.productId)?.tracksInventory !== false),
    [inventory, productById]
  );

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trackedRows;
    return trackedRows.filter((row) => {
      const product = productById.get(row.productId);
      return (
        product?.description.toLowerCase().includes(q) ||
        product?.internalCode.toLowerCase().includes(q) ||
        product?.barcode?.toLowerCase().includes(q)
      );
    });
  }, [trackedRows, productById, search]);

  // Untouched rows still have to reach the parent, counted at whatever the branch currently holds.
  // That used to be done by seeding `quantities` from an effect; deriving it means a row is
  // reported from the first render it exists, and switching branches cannot leave a stale product
  // id behind in the payload.
  const entries = useMemo<InventoryCountEntry[]>(
    () =>
      trackedRows.map((row) => ({
        productId: row.productId,
        quantity: quantities[row.productId] ?? row.currentStock,
      })),
    [trackedRows, quantities]
  );

  useEffect(() => {
    onChange(entries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

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
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Conteo de inventario</p>
        <p className="text-xs text-muted-foreground">
          {visibleRows.length} de {trackedRows.length} productos
        </p>
      </div>
      <Input
        placeholder="Buscar producto por nombre, codigo o barcode..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {visibleRows.length === 0 && (
        <p className="text-sm text-muted-foreground">Ningun producto coincide con la busqueda.</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleRows.map((row) => {
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
