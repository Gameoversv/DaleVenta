"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TenantStatus, TenantSummaryResponse } from "@/types/superadmin";

interface TenantsPage {
  data: TenantSummaryResponse[];
  meta: { total: number; page: number; limit: number };
}

async function fetchTenants(status: string, page: number): Promise<TenantsPage> {
  const res = await api.get<TenantsPage>("/api/super-admin/tenants", {
    params: { status: status || undefined, page, size: 20 },
  });
  return res.data;
}

const STATUSES: TenantStatus[] = ["PENDING", "TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"];

function statusLabel(status: TenantStatus): string {
  const labels: Record<TenantStatus, string> = {
    PENDING: "Pendiente",
    TRIAL: "Trial",
    ACTIVE: "Activo",
    SUSPENDED: "Suspendido",
    CANCELLED: "Cancelado",
  };
  return labels[status];
}

function dateOnly(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "-";
}

export default function SuperAdminTenantsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sa-tenants", status, page],
    queryFn: () => fetchTenants(status, page),
  });

  const tenants = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{total} tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
          {isError && <p className="text-sm text-destructive">No se pudieron cargar los tenants.</p>}
          {tenants.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">No hay tenants para este filtro.</p>
          )}
          {tenants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2">Nombre</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2">Trial vence</th>
                    <th className="py-2 text-right">Usuarios</th>
                    <th className="py-2 text-right">Clientes</th>
                    <th className="py-2">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} className="border-b border-border">
                      <td className="py-2">
                        <Link href={`/super-admin/tenants/${t.id}`} className="font-medium hover:underline">
                          {t.name}
                        </Link>
                      </td>
                      <td className="py-2">{t.plan}</td>
                      <td className="py-2">{statusLabel(t.status)}</td>
                      <td className="py-2">{dateOnly(t.trialEndsAt)}</td>
                      <td className="py-2 text-right">{t.userCount}</td>
                      <td className="py-2 text-right">{t.customerCount}</td>
                      <td className="py-2">{dateOnly(t.createdAt)}</td>
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
