"use client";

import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";
import { ProductFormDialog } from "./ProductFormDialog";
import type { CategoryResponse, ProductResponse } from "@/types/product";

async function fetchProducts(): Promise<ProductResponse[]> {
  const res = await api.get<{ data: ProductResponse[] }>("/api/products");
  return res.data.data;
}

async function fetchCategories(): Promise<CategoryResponse[]> {
  const res = await api.get<{ data: CategoryResponse[] }>("/api/categories");
  return res.data.data;
}

export function ProductTable({ categoryId }: { categoryId: string | null }) {
  const canCreate = usePermission("INVENTORY_CREATE");
  const canEdit = usePermission("INVENTORY_EDIT");
  const { data: products, isLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const filtered = categoryId ? products?.filter((p) => p.categoryId === categoryId) : products;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Catalogo</h2>
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
      {isLoading && <p className="text-muted-foreground">Cargando productos...</p>}
      {filtered && filtered.length === 0 && <p className="text-muted-foreground">No hay productos en esta categoria.</p>}
      {filtered && filtered.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2">Codigo</th>
              <th className="py-2">Descripcion</th>
              <th className="py-2">Costo</th>
              <th className="py-2">Precio</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id} className="border-b border-border">
                <td className="py-2">{product.internalCode}</td>
                <td className="py-2">{product.description}</td>
                <td className="py-2">{product.cost ?? "—"}</td>
                <td className="py-2">{product.salePrice ?? "—"}</td>
                <td className="py-2 text-right">
                  {canEdit && categories && (
                    <ProductFormDialog
                      product={product}
                      categories={categories}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Editar ${product.description}`}>
                          <Pencil className="h-4 w-4" />
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
