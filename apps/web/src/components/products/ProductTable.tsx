"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePermission } from "@/hooks/usePermission";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import api from "@/lib/api";
import { productUnitLabel } from "@/lib/product-units";
import { ProductFormDialog } from "./ProductFormDialog";
import type { CategoryResponse, ProductResponse } from "@/types/product";
import { money } from "@/lib/money";

async function fetchProducts(): Promise<ProductResponse[]> {
  const res = await api.get<{ data: ProductResponse[] }>("/api/products", { params: { includeInactive: true } });
  return res.data.data;
}

async function fetchCategories(): Promise<CategoryResponse[]> {
  const res = await api.get<{ data: CategoryResponse[] }>("/api/categories");
  return res.data.data;
}


type StatusFilter = "all" | "active" | "inactive";

export function ProductTable({ categoryId }: { categoryId: string | null }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const canCreate = usePermission("INVENTORY_CREATE");
  const canEdit = usePermission("INVENTORY_EDIT");
  const tenantFeatures = useTenantFeatures();
  const queryClient = useQueryClient();
  const { data: products, isLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const toggleStatus = useMutation({
    mutationFn: (product: ProductResponse) =>
      api.put(`/api/products/${product.id}`, {
        categoryId: product.categoryId,
        description: product.description,
        unit: product.unit,
        cost: product.cost ?? "0",
        salePrice: product.salePrice ?? "0",
        wholesalePrice: product.wholesalePrice ?? "0",
        taxRate: product.taxRate,
        tracksInventory: product.tracksInventory,
        rentable: product.rentable,
        active: !product.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo actualizar el producto";
      toast.error(message);
    },
  });

  const filtered = useMemo(() => {
    return (products ?? []).filter((product) => {
      if (categoryId && product.categoryId !== categoryId) return false;
      if (statusFilter === "active") return product.active;
      if (statusFilter === "inactive") return !product.active;
      return true;
    });
  }, [categoryId, products, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg font-semibold">Catalogo</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            aria-label="Filtrar productos por estado"
          >
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="all">Todos</option>
          </select>
          {canCreate && categories && (
            <ProductFormDialog
              categories={categories}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Nuevo producto
                </Button>
              }
            />
          )}
        </div>
      </div>
      {isLoading && <p className="text-muted-foreground">Cargando productos...</p>}
      {filtered.length === 0 && !isLoading && (
        <p className="text-muted-foreground">No hay productos para el filtro seleccionado.</p>
      )}
      {filtered.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3">Codigo</th>
                    <th className="px-4 py-3">Descripcion</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3 text-right">Costo</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr key={product.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-muted-foreground">{product.internalCode}</td>
                      <td className="px-4 py-3 font-medium">{product.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{productUnitLabel(product.unit)}</td>
                      <td className="px-4 py-3 text-right font-mono-money text-muted-foreground">{money(product.cost)}</td>
                      <td className="px-4 py-3 text-right font-mono-money font-semibold">
                        {money(product.salePrice)} / {productUnitLabel(product.unit)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={product.active ? "success" : "secondary"}>
                            {product.active ? "Activo" : "Inactivo"}
                          </Badge>
                          {tenantFeatures.rentalModuleEnabled && product.rentable && <Badge variant="info">Alquiler</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEdit && categories && (
                          <div className="flex justify-end gap-1">
                            <ProductFormDialog
                              product={product}
                              categories={categories}
                              trigger={
                                <Button variant="ghost" size="icon" aria-label={`Editar ${product.description}`}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={product.active ? `Desactivar ${product.description}` : `Activar ${product.description}`}
                              disabled={toggleStatus.isPending}
                              onClick={() => toggleStatus.mutate(product)}
                            >
                              {product.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
