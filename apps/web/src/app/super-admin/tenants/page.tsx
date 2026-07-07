"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, CheckCircle, LogIn } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ImpersonateResponse, TenantPlan, TenantStatus, TenantSummaryResponse } from "@/types/superadmin";

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

function extractError(err: unknown): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error";
}

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: "Todos", value: "" },
  { label: "Pendientes", value: "PENDING" },
  { label: "Trial", value: "TRIAL" },
  { label: "Activos", value: "ACTIVE" },
  { label: "Suspendidos", value: "SUSPENDED" },
  { label: "Cancelados", value: "CANCELLED" },
];

const STATUS_LABELS: Record<TenantStatus, string> = {
  PENDING: "Pendiente",
  TRIAL: "Trial",
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
  CANCELLED: "Cancelado",
};

const STATUS_VARIANT: Record<TenantStatus, "warning" | "info" | "success" | "danger" | "secondary"> = {
  PENDING: "warning",
  TRIAL: "info",
  ACTIVE: "success",
  SUSPENDED: "danger",
  CANCELLED: "secondary",
};

function dateOnly(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "-";
}

export default function SuperAdminTenantsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sa-tenants", status, page],
    queryFn: () => fetchTenants(status, page),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["sa-tenants"] });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/super-admin/tenants/${id}/approve`),
    onSuccess: () => {
      invalidate();
      toast.success("Tenant aprobado");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TenantStatus }) =>
      api.patch(`/api/super-admin/tenants/${id}/status`, { status }),
    onSuccess: () => {
      invalidate();
      toast.success("Estado actualizado");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  const planMutation = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: TenantPlan }) =>
      api.patch(`/api/super-admin/tenants/${id}/plan`, { plan }),
    onSuccess: () => {
      invalidate();
      toast.success("Plan actualizado");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  const fiscalModuleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.patch(`/api/super-admin/tenants/${id}/fiscal-module`, { enabled }),
    onSuccess: () => {
      invalidate();
      toast.success("Modulo fiscal actualizado");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  const extendTrialMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/super-admin/tenants/${id}/extend-trial`, null, { params: { days: 30 } }),
    onSuccess: () => {
      invalidate();
      toast.success("Trial extendido 30 dias");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  const impersonateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ data: ImpersonateResponse }>(`/api/super-admin/tenants/${id}/impersonate`);
      return res.data.data;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      toast.success(`Sesion iniciada como ${data.tenantName}`);
      window.location.assign("/dashboard");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  const tenants = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Tenants</h1>
        <p className="text-sm text-muted-foreground">{total} tenants registrados</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {STATUS_FILTERS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatus(opt.value);
              setPage(0);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              status === opt.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Cargando...</p>}
          {isError && <p className="p-6 text-sm text-destructive">No se pudieron cargar los tenants.</p>}
          {tenants.length === 0 && !isLoading && (
            <p className="p-6 text-sm text-muted-foreground">No hay tenants para este filtro.</p>
          )}
          {tenants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Fiscal</th>
                    <th className="px-4 py-3">Trial vence</th>
                    <th className="px-4 py-3 text-right">Usuarios</th>
                    <th className="px-4 py-3 text-right">Clientes</th>
                    <th className="px-4 py-3">Creado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/super-admin/tenants/${t.id}`} className="font-medium hover:underline">
                          {t.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{t.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t.plan}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={t.fiscalModuleEnabled ? "success" : "secondary"}>
                          {t.fiscalModuleEnabled ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{dateOnly(t.trialEndsAt)}</td>
                      <td className="px-4 py-3 text-right">{t.userCount}</td>
                      <td className="px-4 py-3 text-right">{t.customerCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">{dateOnly(t.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {t.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2 text-xs"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(t.id)}
                            >
                              <CheckCircle className="h-3 w-3" /> Aprobar
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                                Acciones <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => impersonateMutation.mutate(t.id)}>
                                <LogIn className="mr-2 h-3.5 w-3.5" /> Impersonar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => extendTrialMutation.mutate(t.id)}>
                                +30 dias trial
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={t.status === "ACTIVE"}
                                onClick={() => statusMutation.mutate({ id: t.id, status: "ACTIVE" })}
                              >
                                Activar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={t.status === "SUSPENDED"}
                                onClick={() => statusMutation.mutate({ id: t.id, status: "SUSPENDED" })}
                              >
                                Suspender
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={t.status === "CANCELLED"}
                                onClick={() => statusMutation.mutate({ id: t.id, status: "CANCELLED" })}
                              >
                                Cancelar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={t.plan === "STARTER"}
                                onClick={() => planMutation.mutate({ id: t.id, plan: "STARTER" })}
                              >
                                Plan Starter
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={t.plan === "PRO"}
                                onClick={() => planMutation.mutate({ id: t.id, plan: "PRO" })}
                              >
                                Plan Pro
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={t.plan === "ENTERPRISE"}
                                onClick={() => planMutation.mutate({ id: t.id, plan: "ENTERPRISE" })}
                              >
                                Plan Enterprise
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={t.fiscalModuleEnabled || fiscalModuleMutation.isPending}
                                onClick={() => fiscalModuleMutation.mutate({ id: t.id, enabled: true })}
                              >
                                Activar modulo fiscal
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!t.fiscalModuleEnabled || fiscalModuleMutation.isPending}
                                onClick={() => fiscalModuleMutation.mutate({ id: t.id, enabled: false })}
                              >
                                Desactivar modulo fiscal
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
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
