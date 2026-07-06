"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDenominationValue } from "@/components/cash-shift/DenominationCountGrid";
import type { BranchResponse, RegisterResponse } from "@/types/branch";
import type { CashMovementResponse, CashShiftSummaryResponse, DenominationResponse } from "@/types/cash-shift";

async function fetchBranches(): Promise<BranchResponse[]> {
  const res = await api.get<{ data: BranchResponse[] }>("/api/branches");
  return res.data.data;
}

async function fetchRegisters(branchId: string): Promise<RegisterResponse[]> {
  const res = await api.get<{ data: RegisterResponse[] }>("/api/registers", { params: { branchId } });
  return res.data.data;
}

async function fetchCashShifts(registerId: string): Promise<CashShiftSummaryResponse[]> {
  const res = await api.get<{ data: CashShiftSummaryResponse[] }>("/api/cash-shifts", { params: { registerId } });
  return res.data.data;
}

async function fetchCashMovements(cashShiftId: string): Promise<CashMovementResponse[]> {
  const res = await api.get<{ data: CashMovementResponse[] }>(`/api/cash-shifts/${cashShiftId}/movements`);
  return res.data.data;
}

async function fetchDenominations(): Promise<DenominationResponse[]> {
  const res = await api.get<{ data: DenominationResponse[] }>("/api/denominations");
  return res.data.data;
}

function money(value: string | null): string {
  return value == null ? "RD$0.00" : `RD$${Number(value).toFixed(2)}`;
}

function dateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "-";
}

function differenceClass(value: string | null): string {
  const difference = Number(value ?? "0");
  if (difference === 0) return "text-emerald-600";
  return "text-amber-600";
}

function movementTypeLabel(type: CashMovementResponse["type"]): string {
  if (type === "ENTRY") return "Entrada";
  if (type === "WITHDRAWAL") return "Retiro";
  return "Gasto";
}

function movementTypeClass(type: CashMovementResponse["type"]): string {
  return type === "ENTRY" ? "text-emerald-600" : "text-rose-600";
}

function StatusBadge({ status }: { status: CashShiftSummaryResponse["status"] }) {
  const styles =
    status === "OPEN"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-zinc-200 bg-zinc-50 text-zinc-700";
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${styles}`}>
      {status === "OPEN" ? "Abierto" : "Cerrado"}
    </span>
  );
}

function ShiftDetailDialog({
  denominationLabel,
  shift,
  trigger,
}: {
  denominationLabel: (id: string) => string;
  shift: CashShiftSummaryResponse;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    data: movements,
    isLoading: movementsLoading,
    isError: movementsError,
  } = useQuery({
    queryKey: ["cash-shift-movements", shift.id],
    queryFn: () => fetchCashMovements(shift.id),
    enabled: open,
  });

  const movementDenominationsLabel = (movement: CashMovementResponse) => {
    if (movement.denominations.length === 0) return "-";
    return movement.denominations
      .map((entry) => `${entry.quantity} x ${denominationLabel(entry.denominationId)}`)
      .join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalle del turno</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Estado</p>
              <StatusBadge status={shift.status} />
            </div>
            <div>
              <p className="text-muted-foreground">Apertura</p>
              <p className="font-medium">{dateTime(shift.openedAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cierre</p>
              <p className="font-medium">{dateTime(shift.closedAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Diferencia</p>
              <p className={cn("font-medium", differenceClass(shift.cashDifference))}>{money(shift.cashDifference)}</p>
            </div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Apertura efectivo</p>
              <p className="font-medium">{money(shift.openingTotal)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Esperado</p>
              <p className="font-medium">{money(shift.expectedCash)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Contado</p>
              <p className="font-medium">{money(shift.countedCash)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Denominaciones</p>
              <p className="font-medium">{shift.denominations.length}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2">Denominacion</th>
                <th className="py-2">Apertura</th>
                <th className="py-2">Actual</th>
                <th className="py-2">Cierre</th>
              </tr>
            </thead>
            <tbody>
              {shift.denominations.map((entry) => (
                <tr key={entry.denominationId} className="border-b border-border">
                  <td className="py-2">{denominationLabel(entry.denominationId)}</td>
                  <td className="py-2">{entry.openingQuantity}</td>
                  <td className="py-2">{entry.currentQuantity}</td>
                  <td className="py-2">{entry.closingQuantity ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Movimientos</h3>
            {movementsLoading && <p className="text-sm text-muted-foreground">Cargando movimientos...</p>}
            {movementsError && <p className="text-sm text-destructive">No se pudieron cargar los movimientos.</p>}
            {!movementsLoading && !movementsError && movements?.length === 0 && (
              <p className="text-sm text-muted-foreground">Este turno no tiene movimientos registrados.</p>
            )}
            {movements && movements.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2">Fecha</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Motivo</th>
                    <th className="py-2">Denominaciones</th>
                    <th className="py-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-b border-border">
                      <td className="py-2">{dateTime(movement.createdAt)}</td>
                      <td className={cn("py-2 font-medium", movementTypeClass(movement.type))}>
                        {movementTypeLabel(movement.type)}
                      </td>
                      <td className="py-2">{movement.reason}</td>
                      <td className="py-2">{movementDenominationsLabel(movement)}</td>
                      <td className="py-2 text-right">{money(movement.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CashShiftHistoryPage() {
  const [branchId, setBranchId] = useState("");
  const [registerId, setRegisterId] = useState("");
  const canViewHistory = usePermission("CASHSHIFT_VIEW_HISTORY");

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    enabled: canViewHistory,
  });
  const { data: registers, isLoading: registersLoading } = useQuery({
    queryKey: ["registers", branchId],
    queryFn: () => fetchRegisters(branchId),
    enabled: canViewHistory && !!branchId,
  });
  const { data: denominations } = useQuery({
    queryKey: ["denominations"],
    queryFn: fetchDenominations,
    enabled: canViewHistory,
  });
  const { data: shifts, isLoading: shiftsLoading, isError } = useQuery({
    queryKey: ["cash-shift-history", registerId],
    queryFn: () => fetchCashShifts(registerId),
    enabled: canViewHistory && !!registerId,
  });

  const denominationById = useMemo(
    () => new Map((denominations ?? []).map((d) => [d.id, formatDenominationValue(d.value)])),
    [denominations]
  );
  const denominationLabel = (id: string) => denominationById.get(id) ?? id;

  if (!canViewHistory) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Historial de caja</h1>
        <p className="text-sm text-muted-foreground">Tu usuario no tiene permiso para consultar historial de turnos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Historial de caja</h1>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="max-w-xs flex-1 space-y-2">
          <label htmlFor="cash-history-branch" className="text-sm font-medium">
            Sucursal
          </label>
          <select
            id="cash-history-branch"
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setRegisterId("");
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{branchesLoading ? "Cargando sucursales..." : "Selecciona una sucursal"}</option>
            {branches?.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        <div className="max-w-xs flex-1 space-y-2">
          <label htmlFor="cash-history-register" className="text-sm font-medium">
            Caja
          </label>
          <select
            id="cash-history-register"
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            disabled={!branchId || registersLoading}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{registersLoading ? "Cargando cajas..." : "Selecciona una caja"}</option>
            {registers?.map((register) => (
              <option key={register.id} value={register.id}>
                {register.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {branchId && !registersLoading && registers?.length === 0 && (
        <p className="text-sm text-muted-foreground">Esta sucursal no tiene cajas activas.</p>
      )}
      {shiftsLoading && <p className="text-muted-foreground">Cargando turnos...</p>}
      {isError && <p className="text-sm text-destructive">No se pudo cargar el historial de turnos.</p>}

      {registerId && shifts && (
        <Card>
          <CardHeader>
            <CardTitle>Turnos registrados</CardTitle>
          </CardHeader>
          <CardContent>
            {shifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay turnos registrados para esta caja.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2">Apertura</th>
                      <th className="py-2">Cierre</th>
                      <th className="py-2">Estado</th>
                      <th className="py-2 text-right">Esperado</th>
                      <th className="py-2 text-right">Contado</th>
                      <th className="py-2 text-right">Diferencia</th>
                      <th className="py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((shift) => (
                      <tr key={shift.id} className="border-b border-border">
                        <td className="py-2">{dateTime(shift.openedAt)}</td>
                        <td className="py-2">{dateTime(shift.closedAt)}</td>
                        <td className="py-2"><StatusBadge status={shift.status} /></td>
                        <td className="py-2 text-right">{money(shift.expectedCash)}</td>
                        <td className="py-2 text-right">{money(shift.countedCash)}</td>
                        <td className={cn("py-2 text-right font-medium", differenceClass(shift.cashDifference))}>
                          {money(shift.cashDifference)}
                        </td>
                        <td className="py-2">
                          <div className="flex justify-end">
                            <ShiftDetailDialog
                              shift={shift}
                              denominationLabel={denominationLabel}
                              trigger={
                                <Button variant="ghost" size="icon" aria-label="Ver detalle del turno">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
