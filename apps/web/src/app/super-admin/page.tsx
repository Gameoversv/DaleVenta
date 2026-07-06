"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExpiringTenantResponse, GlobalStatsResponse, TenantSummaryResponse } from "@/types/superadmin";

async function fetchStats(): Promise<GlobalStatsResponse> {
  const res = await api.get<{ data: GlobalStatsResponse }>("/api/super-admin/stats");
  return res.data.data;
}

async function fetchExpiringTrials(): Promise<ExpiringTenantResponse[]> {
  const res = await api.get<{ data: ExpiringTenantResponse[] }>("/api/super-admin/stats/expiring-trials");
  return res.data.data;
}

async function fetchRecentTenants(): Promise<TenantSummaryResponse[]> {
  const res = await api.get<{ data: TenantSummaryResponse[] }>("/api/super-admin/stats/recent-tenants");
  return res.data.data;
}

function dateOnly(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboardPage() {
  const { data: stats } = useQuery({ queryKey: ["sa-stats"], queryFn: fetchStats });
  const { data: expiring } = useQuery({ queryKey: ["sa-expiring-trials"], queryFn: fetchExpiringTrials });
  const { data: recent } = useQuery({ queryKey: ["sa-recent-tenants"], queryFn: fetchRecentTenants });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Resumen global</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Tenants totales" value={stats?.tenantsTotal ?? 0} />
        <StatCard label="Pendientes" value={stats?.tenantsPending ?? 0} />
        <StatCard label="En trial" value={stats?.tenantsTrial ?? 0} />
        <StatCard label="Activos" value={stats?.tenantsActive ?? 0} />
        <StatCard label="Suspendidos" value={stats?.tenantsSuspended ?? 0} />
        <StatCard label="Cancelados" value={stats?.tenantsCancelled ?? 0} />
        <StatCard label="Usuarios totales" value={stats?.usersTotal ?? 0} />
        <StatCard label="Clientes totales" value={stats?.customersTotal ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trials por vencer</CardTitle>
          </CardHeader>
          <CardContent>
            {expiring && expiring.length === 0 && (
              <p className="text-sm text-muted-foreground">Ningun trial por vencer.</p>
            )}
            {expiring && expiring.length > 0 && (
              <ul className="space-y-2 text-sm">
                {expiring.map((t) => (
                  <li key={t.id} className="flex items-center justify-between">
                    <Link href={`/super-admin/tenants/${t.id}`} className="hover:underline">
                      {t.name}
                    </Link>
                    <span className="text-muted-foreground">{dateOnly(t.trialEndsAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenants recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recent && recent.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin tenants todavia.</p>
            )}
            {recent && recent.length > 0 && (
              <ul className="space-y-2 text-sm">
                {recent.map((t) => (
                  <li key={t.id} className="flex items-center justify-between">
                    <Link href={`/super-admin/tenants/${t.id}`} className="hover:underline">
                      {t.name}
                    </Link>
                    <span className="text-muted-foreground">{t.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
