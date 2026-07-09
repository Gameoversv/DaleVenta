"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { productUnitLabel } from "@/lib/product-units";
import type { CategoryResponse, ProductResponse } from "@/types/product";

interface ProductSearchPanelProps {
  products: ProductResponse[];
  onSelect: (product: ProductResponse) => void;
}

async function fetchCategories(): Promise<CategoryResponse[]> {
  const res = await api.get<{ data: CategoryResponse[] }>("/api/categories");
  return res.data.data;
}

function money(value: string | null): string {
  return value != null ? `RD$${Number(value).toFixed(2)}` : "-";
}

export function ProductSearchPanel({ products, onSelect }: ProductSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (!normalized) return true;
      return (
        p.description.toLowerCase().includes(normalized) ||
        p.internalCode.toLowerCase().includes(normalized) ||
        (p.barcode ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [products, categoryId, normalized]);

  const visible = filtered.slice(0, 60);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar producto por nombre, codigo o barcode..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-10 text-base"
          />
        </div>

        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryId("")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                categoryId === "" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              )}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  categoryId === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {normalized || categoryId ? "Ningun producto coincide con la busqueda." : "Sin productos registrados todavia."}
          </p>
        ) : (
          <div className="grid max-h-[28rem] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p)}
                className="flex flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-card)] active:scale-[0.98]"
              >
                <span className="line-clamp-2 text-sm font-medium leading-snug">{p.description}</span>
                <span className="font-mono-money text-sm font-bold text-primary">
                  {money(p.salePrice)} / {productUnitLabel(p.unit)}
                </span>
                <span className="text-xs text-muted-foreground">{p.internalCode}</span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
