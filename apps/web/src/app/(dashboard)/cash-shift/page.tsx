"use client";

import { useState } from "react";
import Link from "next/link";
import { usePermission } from "@/hooks/usePermission";
import { useSoleBranch } from "@/hooks/useSoleBranch";
import { useSoleRegister } from "@/hooks/useSoleRegister";
import { Button } from "@/components/ui/button";
import { CashShiftWorkspace } from "@/components/cash-shift/CashShiftWorkspace";

export default function CashShiftPage() {
  const [manualBranchId, setManualBranchId] = useState("");
  const [manualRegisterId, setManualRegisterId] = useState("");
  const canOpenCashShift = usePermission("CASHSHIFT_OPEN");
  const canManageSettings = usePermission("SETTINGS_MANAGE");
  const {
    branches,
    isLoading: branchesLoading,
    isError: branchesError,
    hasMultiple: hasMultipleBranches,
    soleBranchId,
  } = useSoleBranch(canOpenCashShift);
  const branchId = hasMultipleBranches ? manualBranchId : soleBranchId;

  const {
    registers,
    isLoading: registersLoading,
    isError: registersError,
    hasMultiple: hasMultipleRegisters,
    soleRegisterId,
  } = useSoleRegister(branchId, canOpenCashShift);
  const registerId = hasMultipleRegisters ? manualRegisterId : soleRegisterId;

  if (!canOpenCashShift) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Turno de Caja</h1>
        <p className="text-sm text-muted-foreground">
          Tu usuario no tiene permiso para operar turnos de caja.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Turno de Caja</h1>
      {branchesError && (
        <p className="text-sm text-destructive">No se pudieron cargar las sucursales.</p>
      )}
      {!branchesLoading && branches.length === 0 && (
        <div className="space-y-3 rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">
            No hay sucursales activas. Crea una sucursal y una caja antes de abrir un turno.
          </p>
          {canManageSettings && (
            <Button asChild size="sm">
              <Link href="/branches">Ir a sucursales</Link>
            </Button>
          )}
        </div>
      )}
      {(hasMultipleBranches || hasMultipleRegisters) && (
        <div className="flex flex-col gap-4 sm:flex-row">
          {hasMultipleBranches && (
            <div className="max-w-xs flex-1 space-y-2">
              <label htmlFor="cash-shift-branch" className="text-sm font-medium">
                Sucursal
              </label>
              <select
                id="cash-shift-branch"
                value={manualBranchId}
                onChange={(e) => {
                  setManualBranchId(e.target.value);
                  setManualRegisterId("");
                }}
                disabled={branchesLoading || branchesError}
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
              <label htmlFor="cash-shift-register" className="text-sm font-medium">
                Caja
              </label>
              <select
                id="cash-shift-register"
                value={manualRegisterId}
                onChange={(e) => setManualRegisterId(e.target.value)}
                disabled={!branchId || registersLoading || registersError}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">
                  {registersLoading ? "Cargando cajas..." : "Selecciona una caja"}
                </option>
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
      {registersError && (
        <p className="text-sm text-destructive">No se pudieron cargar las cajas de esta sucursal.</p>
      )}
      {branchId && !registersLoading && registers.length === 0 && (
        <div className="space-y-3 rounded-md border border-border p-4">
          <p className="text-sm text-muted-foreground">
            Esta sucursal no tiene cajas activas. Crea una caja antes de abrir el turno.
          </p>
          {canManageSettings && (
            <Button asChild size="sm" variant="secondary">
              <Link href="/branches">Administrar cajas</Link>
            </Button>
          )}
        </div>
      )}
      {registerId && <CashShiftWorkspace key={registerId} registerId={registerId} branchId={branchId} />}
    </div>
  );
}
