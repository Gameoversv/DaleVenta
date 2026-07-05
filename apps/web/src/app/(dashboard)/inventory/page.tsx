"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import type { BranchResponse } from "@/types/branch";

async function fetchBranches(): Promise<BranchResponse[]> {
  const res = await api.get<{ data: BranchResponse[] }>("/api/branches");
  return res.data.data;
}

export default function InventoryPage() {
  const [branchId, setBranchId] = useState<string>("");
  const { data: branches } = useQuery({ queryKey: ["branches"], queryFn: fetchBranches });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Inventario</h1>
      <div className="max-w-xs space-y-2">
        <label htmlFor="branch-select" className="text-sm font-medium">
          Sucursal
        </label>
        <select
          id="branch-select"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Selecciona una sucursal</option>
          {branches?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      {branchId && <InventoryTable branchId={branchId} />}
    </div>
  );
}
