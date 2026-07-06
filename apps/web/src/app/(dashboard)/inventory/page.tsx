"use client";

import { useState } from "react";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { useSoleBranch } from "@/hooks/useSoleBranch";

export default function InventoryPage() {
  const [manualBranchId, setManualBranchId] = useState<string>("");
  const { branches, hasMultiple, soleBranchId } = useSoleBranch();
  const branchId = hasMultiple ? manualBranchId : soleBranchId;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Inventario</h1>
      {hasMultiple && (
        <div className="max-w-xs space-y-2">
          <label htmlFor="branch-select" className="text-sm font-medium">
            Sucursal
          </label>
          <select
            id="branch-select"
            value={manualBranchId}
            onChange={(e) => setManualBranchId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Selecciona una sucursal</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {branchId && <InventoryTable branchId={branchId} />}
    </div>
  );
}
