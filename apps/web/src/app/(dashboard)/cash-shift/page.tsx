"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { useSoleBranch } from "@/hooks/useSoleBranch";
import { Button } from "@/components/ui/button";
import { CashShiftWorkspace } from "@/components/cash-shift/CashShiftWorkspace";
import type { RegisterResponse } from "@/types/branch";

async function fetchRegisters(branchId: string): Promise<RegisterResponse[]> {
  const res = await api.get<{ data: RegisterResponse[] }>("/api/registers", { params: { branchId } });
  return res.data.data;
}

export default function CashShiftPage() {
  const [manualBranchId, setManualBranchId] = useState("");
  const [registerId, setRegisterId] = useState("");
  const canOpenCashShift = usePermission("CASHSHIFT_OPEN");
  const canManageSettings = usePermission("SETTINGS_MANAGE");
  const { branches, isLoading: branchesLoading, isError: branchesError, hasMultiple, soleBranchId } = useSoleBranch();
  const branchId = hasMultiple ? manualBranchId : soleBranchId;

  const {
    data: registers,
    isLoading: registersLoading,
    isError: registersError,
  } = useQuery({
    queryKey: ["registers", branchId],
    queryFn: () => fetchRegisters(branchId),
    enabled: canOpenCashShift && !!branchId,
  });

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
      {!branchesLoading && branches && branches.length === 0 && (
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
      <div className="flex flex-col gap-4 sm:flex-row">
        {hasMultiple && (
          <div className="max-w-xs flex-1 space-y-2">
            <label htmlFor="cash-shift-branch" className="text-sm font-medium">
              Sucursal
            </label>
            <select
              id="cash-shift-branch"
              value={manualBranchId}
              onChange={(e) => {
                setManualBranchId(e.target.value);
                setRegisterId("");
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
        <div className="max-w-xs flex-1 space-y-2">
          <label htmlFor="cash-shift-register" className="text-sm font-medium">
            Caja
          </label>
          <select
            id="cash-shift-register"
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            disabled={!branchId || registersLoading || registersError}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">
              {registersLoading ? "Cargando cajas..." : "Selecciona una caja"}
            </option>
            {registers?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {registersError && (
        <p className="text-sm text-destructive">No se pudieron cargar las cajas de esta sucursal.</p>
      )}
      {branchId && !registersLoading && registers && registers.length === 0 && (
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
