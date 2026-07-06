"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminActionResponse } from "@/types/superadmin";

interface AuditPage {
  data: AdminActionResponse[];
  meta: { total: number; page: number; limit: number };
}

async function fetchAudit(page: number): Promise<AuditPage> {
  const res = await api.get<AuditPage>("/api/super-admin/audit", { params: { page, size: 30 } });
  return res.data;
}

function dateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export default function SuperAdminAuditPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useQuery({ queryKey: ["sa-audit", page], queryFn: () => fetchAudit(page) });

  const entries = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Auditoria</h1>
        <p className="text-sm text-muted-foreground">{total} acciones registradas</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Cargando...</p>}
          {entries.length === 0 && !isLoading && (
            <p className="p-6 text-sm text-muted-foreground">Sin acciones registradas.</p>
          )}
          {entries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Accion</th>
                    <th className="px-4 py-3">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-muted-foreground">{dateTime(a.createdAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.actorEmail}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{a.action}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.detail ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-md border border-input px-3 py-1 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-muted-foreground">
                Pagina {page + 1} de {totalPages}
              </span>
              <button
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-input px-3 py-1 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
