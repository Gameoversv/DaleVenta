"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomerResponse } from "@/types/customer";

// Un <select> con todos los clientes no escala: hay padrones de miles de
// registros. Se consulta al servidor, que ya filtra por nombre, telefono,
// whatsapp, email y cedula.
async function searchCustomers(q: string): Promise<CustomerResponse[]> {
  const res = await api.get<{ data: CustomerResponse[] }>("/api/customers", {
    params: { q, size: 10 },
  });
  return res.data.data;
}

interface CustomerSearchSelectProps {
  id: string;
  customerId: string;
  customerName: string;
  onChange: (customer: { id: string; fullName: string } | null) => void;
  placeholder?: string;
  emptyLabel?: string;
}

export function CustomerSearchSelect({
  id,
  customerId,
  customerName,
  onChange,
  placeholder = "Buscar por nombre, telefono o cedula...",
  emptyLabel = "Cliente de contado",
}: Readonly<CustomerSearchSelectProps>) {
  const [query, setQuery] = useState("");
  const term = query.trim();

  const { data: results, isFetching } = useQuery({
    queryKey: ["customer-search", term],
    queryFn: () => searchCustomers(term),
    enabled: term.length > 0,
  });

  if (customerId) {
    return (
      <div className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 text-sm">
        <span className="truncate font-medium">{customerName}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          aria-label="Quitar cliente"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        id={id}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      {term.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border">
          {isFetching && !results && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Buscando...</p>
          )}
          {results?.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Sin coincidencias.</p>
          )}
          <ul className="divide-y divide-border">
            {results?.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ id: customer.id, fullName: customer.fullName });
                    setQuery("");
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="font-medium">{customer.fullName}</span>
                  {customer.phone && (
                    <span className="ml-2 text-muted-foreground">{customer.phone}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Sin seleccion = {emptyLabel}.</p>
    </div>
  );
}
