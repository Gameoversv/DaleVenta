"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuditLogResponse, PagedApiResponse } from "@/types/audit";

async function fetchAudit(page: number, entityType: string): Promise<PagedApiResponse<AuditLogResponse[]>> {
  const res = await api.get<PagedApiResponse<AuditLogResponse[]>>("/api/audit-logs", {
    params: { page, size: 30, entityType: entityType || undefined },
  });
  return res.data;
}

function dateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    SALE_VOID: "Venta anulada",
    INVENTORY_ADJUSTMENT: "Inventario ajustado",
    USER_PERMISSION_OVERRIDE: "Permiso modificado",
    USER_PASSWORD_SET: "Clave reiniciada",
    PRODUCT_STATUS_CHANGE: "Producto activado/desactivado",
    PRODUCT_PRICE_CHANGE: "Precio de producto cambiado",
    CASH_SHIFT_CLOSE: "Turno de caja cerrado",
    INVOICE_SETTINGS_UPDATE: "Configuracion de factura",
    DAILY_CLOSE_CREATE: "Cierre diario guardado",
  };
  return labels[action] ?? action;
}

export default function AuditPage() {
  const canViewAudit = usePermission("AUDIT_VIEW");
  const [page, setPage] = useState(0);
  const [entityType, setEntityType] = useState("");
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
        <form
          className="flex gap-2 sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(0);
            setAppliedEntityType(entityType.trim().toUpperCase());
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="audit-entity">Entidad</Label>
            <Input id="audit-entity" placeholder="SALE, PRODUCT, CASH_SHIFT" value={entityType} onChange={(event) => setEntityType(event.target.value)} />
          </div>
          <Button type="submit">
            <Search className="h-4 w-4" />
          </Button>
        </form>
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
                      <td className="py-3 pr-4 font-medium">{actionLabel(log.action)}</td>
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
