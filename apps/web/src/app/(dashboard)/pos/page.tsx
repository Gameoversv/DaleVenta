"use client";

import { useState } from "react";
import { PosWorkspace } from "@/components/pos/PosWorkspace";
import { usePermission } from "@/hooks/usePermission";
import { useSoleBranch } from "@/hooks/useSoleBranch";
import { useSoleRegister } from "@/hooks/useSoleRegister";
import { PageHeader } from "@/components/common/page-header";
import { PermissionDenied } from "@/components/common/permission-denied";

export default function PosPage() {
  const [manualBranchId, setManualBranchId] = useState("");
  const [manualRegisterId, setManualRegisterId] = useState("");
  const canCreateSale = usePermission("SALE_CREATE");
  const { branches, hasMultiple: hasMultipleBranches, soleBranchId } = useSoleBranch(canCreateSale);
  const branchId = hasMultipleBranches ? manualBranchId : soleBranchId;

  const { registers, hasMultiple: hasMultipleRegisters, soleRegisterId } = useSoleRegister(branchId, canCreateSale);
  const registerId = hasMultipleRegisters ? manualRegisterId : soleRegisterId;

  if (!canCreateSale) {
    return <PermissionDenied title="POS" message="No tienes permiso para crear ventas." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="POS" />
      {(hasMultipleBranches || hasMultipleRegisters) && (
        <div className="flex gap-4">
          {hasMultipleBranches && (
            <div className="max-w-xs flex-1 space-y-2">
              <label htmlFor="pos-branch" className="text-sm font-medium">
                Sucursal
              </label>
              <select
                id="pos-branch"
                value={manualBranchId}
                onChange={(e) => {
                  setManualBranchId(e.target.value);
                  setManualRegisterId("");
                }}
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
          {hasMultipleRegisters && (
            <div className="max-w-xs flex-1 space-y-2">
              <label htmlFor="pos-register" className="text-sm font-medium">
                Caja
              </label>
              <select
                id="pos-register"
                value={manualRegisterId}
                onChange={(e) => setManualRegisterId(e.target.value)}
                disabled={!branchId}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona una caja</option>
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
      {registerId && <PosWorkspace registerId={registerId} />}
    </div>
  );
}
