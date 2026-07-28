"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Clock3, Users, UserCircle, CheckCircle2, PauseCircle, XCircle, Hourglass } from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ExpiringTenantResponse, GlobalStatsResponse, TenantSummaryResponse } from "@/types/superadmin";
import { dateOnly } from "@/lib/dates";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "secondary" | "info"> = {
  ACTIVE: "success",
  PENDING: "warning",
  TRIAL: "info",
  SUSPENDED: "danger",
  CANCELLED: "secondary",
};

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


const TONE_STYLES = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  danger: "bg-destructive/10 text-destructive",
  secondary: "bg-secondary text-muted-foreground",
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
  tone: keyof typeof TONE_STYLES;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TONE_STYLES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
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
      <h1 className="font-display text-2xl font-bold tracking-tight">Resumen global</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Tenants totales" value={stats?.tenantsTotal ?? 0} icon={Building2} tone="primary" />
        <StatCard label="Pendientes" value={stats?.tenantsPending ?? 0} icon={Hourglass} tone="warning" />
        <StatCard label="En trial" value={stats?.tenantsTrial ?? 0} icon={Clock3} tone="info" />
        <StatCard label="Activos" value={stats?.tenantsActive ?? 0} icon={CheckCircle2} tone="success" />
        <StatCard label="Suspendidos" value={stats?.tenantsSuspended ?? 0} icon={PauseCircle} tone="danger" />
        <StatCard label="Cancelados" value={stats?.tenantsCancelled ?? 0} icon={XCircle} tone="secondary" />
        <StatCard label="Usuarios totales" value={stats?.usersTotal ?? 0} icon={Users} tone="primary" />
        <StatCard label="Clientes totales" value={stats?.customersTotal ?? 0} icon={UserCircle} tone="info" />
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
                    <Badge variant={STATUS_VARIANT[t.status] ?? "secondary"}>{t.status}</Badge>
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
