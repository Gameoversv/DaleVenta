"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashMovementDialog } from "./CashMovementDialog";
import { formatDenominationValue } from "./DenominationCountGrid";
import type { CashShiftSummaryResponse, DenominationResponse } from "@/types/cash-shift";

async function fetchDenominations(): Promise<DenominationResponse[]> {
  const res = await api.get<{ data: DenominationResponse[] }>("/api/denominations");
  return res.data.data;
}

interface ShiftSummaryProps {
  shift: CashShiftSummaryResponse;
  registerId: string;
  onRequestClose: () => void;
}

export function ShiftSummary({ shift, registerId, onRequestClose }: ShiftSummaryProps) {
  const canClose = usePermission("CASHSHIFT_CLOSE");
  const { data: denominations } = useQuery({ queryKey: ["denominations"], queryFn: fetchDenominations });

  const denominationLabel = (id: string) => {
    const d = denominations?.find((d) => d.id === id);
    return d ? formatDenominationValue(d.value) : id;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Turno abierto</CardTitle>
        <Badge variant="success">Activo</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Abierto</p>
            <p className="font-medium">{new Date(shift.openedAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total de apertura</p>
            <p className="font-mono-money font-semibold">RD${shift.openingTotal}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Efectivo esperado</p>
            <p className="font-mono-money font-semibold">RD${shift.expectedCash}</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2">Denominacion</th>
              <th className="py-2">Cantidad actual</th>
            </tr>
          </thead>
          <tbody>
            {shift.denominations.map((d) => (
              <tr key={d.denominationId} className="border-b border-border">
                <td className="py-2">{denominationLabel(d.denominationId)}</td>
                <td className="py-2">{d.currentQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2">
          <CashMovementDialog
            cashShiftId={shift.id}
            registerId={registerId}
            trigger={<Button variant="secondary">Registrar movimiento</Button>}
          />
          {canClose && (
            <Button variant="outline" onClick={onRequestClose}>
              Cerrar turno
            </Button>
          )}
        </div>
        {!canClose && (
          <p className="text-sm text-muted-foreground">
            Tu usuario puede operar este turno, pero no tiene permiso para cerrarlo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
