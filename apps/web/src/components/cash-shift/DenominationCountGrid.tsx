"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DenominationCountEntry, DenominationResponse } from "@/types/cash-shift";

async function fetchDenominations(): Promise<DenominationResponse[]> {
  const res = await api.get<{ data: DenominationResponse[] }>("/api/denominations");
  return res.data.data;
}

export function formatDenominationValue(value: string): string {
  const n = Number(value);
  return Number.isInteger(n) ? `RD$${n}` : `RD$${n.toFixed(2)}`;
}

interface DenominationCountGridProps {
  onChange: (entries: DenominationCountEntry[]) => void;
}

export function DenominationCountGrid({ onChange }: DenominationCountGridProps) {
  const { data: denominations } = useQuery({ queryKey: ["denominations"], queryFn: fetchDenominations });
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const handleChange = (denominationId: string, rawValue: string) => {
    const quantity = Math.max(0, parseInt(rawValue, 10) || 0);
    const next = { ...quantities, [denominationId]: quantity };
    setQuantities(next);
    onChange(
      Object.entries(next)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ denominationId: id, quantity: qty }))
    );
  };

  const active = denominations?.filter((d) => d.active) ?? [];
  const total = active.reduce((sum, d) => sum + (quantities[d.id] ?? 0) * Number(d.value), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {active.map((d) => (
          <div key={d.id} className="space-y-1">
            <Label htmlFor={`denom-${d.id}`}>{formatDenominationValue(d.value)}</Label>
            <Input
              id={`denom-${d.id}`}
              type="number"
              min={0}
              value={quantities[d.id] ?? ""}
              onChange={(e) => handleChange(d.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <p className="text-sm font-medium">Total: RD${total.toFixed(2)}</p>
    </div>
  );
}
