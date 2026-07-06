"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CustomerResponse } from "@/types/customer";

async function searchCustomers(q: string): Promise<CustomerResponse[]> {
  const res = await api.get<{ data: CustomerResponse[] }>("/api/customers", { params: { q } });
  return res.data.data;
}

interface CustomerPickerProps {
  customer: CustomerResponse | null;
  onChange: (customer: CustomerResponse | null) => void;
}

export function CustomerPicker({ customer, onChange }: CustomerPickerProps) {
  const [query, setQuery] = useState("");

  const { data: results } = useQuery({
    queryKey: ["customers", query],
    queryFn: () => searchCustomers(query),
    enabled: query.trim().length > 0,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {customer ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{customer.fullName}</span>
            <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
              Quitar
            </Button>
          </div>
        ) : (
          <>
            <Input
              placeholder="Buscar cliente (opcional)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {results && results.length > 0 && (
              <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-md border border-border">
                {results.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(c);
                        setQuery("");
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      {c.fullName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">Sin seleccion = Cliente de contado.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
