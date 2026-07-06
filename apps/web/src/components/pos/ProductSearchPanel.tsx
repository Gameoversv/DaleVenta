"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ProductResponse } from "@/types/product";

interface ProductSearchPanelProps {
  products: ProductResponse[];
  onSelect: (product: ProductResponse) => void;
}

export function ProductSearchPanel({ products, onSelect }: ProductSearchPanelProps) {
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();
  const results = normalized
    ? products
        .filter(
          (p) =>
            p.description.toLowerCase().includes(normalized) ||
            p.internalCode.toLowerCase().includes(normalized) ||
            (p.barcode ?? "").toLowerCase().includes(normalized)
        )
        .slice(0, 20)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buscar producto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Descripcion, codigo o codigo de barras"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(p);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span>{p.description}</span>
                  <span className="text-muted-foreground">{p.internalCode}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
