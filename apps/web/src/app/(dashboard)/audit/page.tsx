"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { AuditLogResponse, PagedApiResponse } from "@/types/audit";
import { dateTime } from "@/lib/dates";
import { auditActionLabel } from "@/lib/status-labels";

const ENTITY_FILTERS = [
  { value: "", label: "Todas" },
  { value: "SALE", label: "Ventas" },
  { value: "PRODUCT", label: "Productos" },
  { value: "CASH_SHIFT", label: "Turnos de caja" },
  { value: "DAILY_CLOSING", label: "Cierres diarios" },
  { value: "TENANT", label: "Configuracion de factura" },
  { value: "BRANCH_INVENTORY", label: "Inventario" },
  { value: "USER", label: "Usuarios y permisos" },
] as const;

async function fetchAudit(page: number, entityType: string): Promise<PagedApiResponse<AuditLogResponse[]>> {
  const res = await api.get<PagedApiResponse<AuditLogResponse[]>>("/api/audit-logs", {
    params: { page, size: 30, entityType: entityType || undefined },
  });
  return res.data;
}



export default function AuditPage() {
  const canViewAudit = usePermission("AUDIT_VIEW");
  const [page, setPage] = useState(0);
  const [appliedEntityType, setAppliedEntityType] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs", page, appliedEntityType],
    queryFn: () => fetchAudit(page, appliedEntityType),
    enabled: canViewAudit,
  });
  const logs = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  if (!canViewAudit) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Auditoria</h1>
        <p className="text-muted-foreground">No tienes permiso para ver auditoria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Auditoria</h1>
          <p className="text-sm text-muted-foreground">{total} eventos registrados</p>
        </div>
        <div className="flex gap-2 sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="audit-entity">Filtrar por</Label>
            <select
              id="audit-entity"
              value={appliedEntityType}
              onChange={(event) => {
                setPage(0);
                setAppliedEntityType(event.target.value);
              }}
              className="flex h-10 min-w-56 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ENTITY_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="outline" disabled>
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando auditoria...</p>}
          {isError && <p className="text-sm text-destructive">No se pudo cargar la auditoria.</p>}
          {!isLoading && logs.length === 0 && <p className="text-sm text-muted-foreground">No hay eventos para este filtro.</p>}
          {logs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Usuario</th>
                    <th className="py-2 pr-4">Accion</th>
                    <th className="py-2 pr-4">Entidad</th>
                    <th className="py-2">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 whitespace-nowrap">{dateTime(log.createdAt)}</td>
                      <td className="py-3 pr-4">{log.actorName ?? log.actorUserId}</td>
                      <td className="py-3 pr-4 font-medium">{auditActionLabel(log.action)}</td>
                      <td className="py-3 pr-4">{log.entityType}</td>
                      <td className="py-3">{log.reason ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
              Anterior
            </Button>
            <Button variant="outline" disabled={(page + 1) * 30 >= total} onClick={() => setPage((current) => current + 1)}>
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
