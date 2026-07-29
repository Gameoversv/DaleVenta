"use client";

import { useState } from "react";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { usePermission } from "@/hooks/usePermission";
import { useSoleBranch } from "@/hooks/useSoleBranch";
import { PageHeader } from "@/components/common/page-header";
import { PermissionDenied } from "@/components/common/permission-denied";

export default function InventoryPage() {
  const [manualBranchId, setManualBranchId] = useState<string>("");
  const canViewInventory = usePermission("INVENTORY_VIEW");
  const { branches, hasMultiple, soleBranchId } = useSoleBranch(canViewInventory);
  const branchId = hasMultiple ? manualBranchId : soleBranchId;

  if (!canViewInventory) {
    return <PermissionDenied title="Inventario" message="No tienes permiso para ver inventario." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inventario" />
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
