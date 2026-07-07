"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ImpersonateResponse, TenantDetailResponse, TenantPlan, TenantStatus } from "@/types/superadmin";

async function fetchTenant(id: string): Promise<TenantDetailResponse> {
  const res = await api.get<{ data: TenantDetailResponse }>(`/api/super-admin/tenants/${id}`);
  return res.data.data;
}

function extractError(err: unknown): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error";
}

function dateOnly(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "-";
}

const STATUSES: TenantStatus[] = ["PENDING", "TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"];
const PLANS: TenantPlan[] = ["STARTER", "PRO", "ENTERPRISE"];

const STATUS_VARIANT: Record<TenantStatus, "warning" | "info" | "success" | "danger" | "secondary"> = {
  PENDING: "warning",
  TRIAL: "info",
  ACTIVE: "success",
  SUSPENDED: "danger",
  CANCELLED: "secondary",
};

function ExtendTrialDialog({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("30");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.post(`/api/super-admin/tenants/${tenantId}/extend-trial`, null, { params: { days } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-tenant", tenantId] });
      setOpen(false);
      toast.success("Trial extendido");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Extender trial
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extender trial</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="extend-days">Dias</Label>
          <Input id="extend-days" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Extendiendo..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SuperAdminTenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params.id;
  const queryClient = useQueryClient();

  const { data: tenant, isLoading, isError } = useQuery({
    queryKey: ["sa-tenant", tenantId],
    queryFn: () => fetchTenant(tenantId),
  });

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/api/super-admin/tenants/${tenantId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-tenant", tenantId] });
      toast.success("Tenant aprobado");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  const statusMutation = useMutation({
    mutationFn: (status: TenantStatus) => api.patch(`/api/super-admin/tenants/${tenantId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-tenant", tenantId] });
      toast.success("Estado actualizado");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  const planMutation = useMutation({
    mutationFn: (plan: TenantPlan) => api.patch(`/api/super-admin/tenants/${tenantId}/plan`, { plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-tenant", tenantId] });
      toast.success("Plan actualizado");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  const fiscalModuleMutation = useMutation({
    mutationFn: (enabled: boolean) => api.patch(`/api/super-admin/tenants/${tenantId}/fiscal-module`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-tenant", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["sa-tenants"] });
      toast.success("Modulo fiscal actualizado");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  const impersonateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: ImpersonateResponse }>(`/api/super-admin/tenants/${tenantId}/impersonate`);
      return res.data.data;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      toast.success(`Sesion iniciada como ${data.tenantName}`);
      window.location.assign("/dashboard");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  if (isLoading) return <p className="text-muted-foreground">Cargando...</p>;
  if (isError || !tenant) return <p className="text-sm text-destructive">No se pudo cargar el tenant.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">{tenant.name}</h1>
            <p className="text-sm text-muted-foreground">{tenant.slug}</p>
          </div>
          <Badge variant={STATUS_VARIANT[tenant.status]}>{tenant.status}</Badge>
        </div>
        <div className="flex gap-2">
          {tenant.status === "PENDING" && (
            <Button size="sm" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "Aprobando..." : "Aprobar"}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => impersonateMutation.mutate()}
            disabled={impersonateMutation.isPending}
          >
            {impersonateMutation.isPending ? "Entrando..." : "Impersonar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informacion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Ciudad: <span className="text-muted-foreground">{tenant.city ?? "-"}</span></p>
            <p>Telefono: <span className="text-muted-foreground">{tenant.phone ?? "-"}</span></p>
            <p>Email: <span className="text-muted-foreground">{tenant.email ?? "-"}</span></p>
            <p>RNC: <span className="text-muted-foreground">{tenant.rnc ?? "-"}</span></p>
            <p>
              Modulo fiscal:{" "}
              <Badge variant={tenant.fiscalModuleEnabled ? "success" : "secondary"}>
                {tenant.fiscalModuleEnabled ? "Activo" : "Inactivo"}
              </Badge>
            </p>
            <p>Creado: <span className="text-muted-foreground">{dateOnly(tenant.createdAt)}</span></p>
            <p>Trial vence: <span className="text-muted-foreground">{dateOnly(tenant.trialEndsAt)}</span></p>
            <p>Usuarios: <span className="text-muted-foreground">{tenant.userCount}</span></p>
            <p>Clientes: <span className="text-muted-foreground">{tenant.customerCount}</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado y plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-status">Estado</Label>
              <select
                id="tenant-status"
                value={tenant.status}
                onChange={(e) => statusMutation.mutate(e.target.value as TenantStatus)}
                disabled={statusMutation.isPending}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-plan">Plan</Label>
              <select
                id="tenant-plan"
                value={tenant.plan}
                onChange={(e) => planMutation.mutate(e.target.value as TenantPlan)}
                disabled={planMutation.isPending}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Modulo fiscal / NCF</p>
                  <p className="text-xs text-muted-foreground">
                    Habilita RNC, comprobantes fiscales, secuencias NCF y factura fiscal para este tenant.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={tenant.fiscalModuleEnabled ? "secondary" : "default"}
                  size="sm"
                  onClick={() => fiscalModuleMutation.mutate(!tenant.fiscalModuleEnabled)}
                  disabled={fiscalModuleMutation.isPending}
                >
                  {fiscalModuleMutation.isPending
                    ? "Actualizando..."
                    : tenant.fiscalModuleEnabled
                      ? "Desactivar"
                      : "Activar"}
                </Button>
              </div>
            </div>
            <ExtendTrialDialog tenantId={tenantId} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Administradores</CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.owners.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este tenant no tiene administradores.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {tenant.owners.map((owner) => (
                  <tr key={owner.id} className="border-b border-border last:border-0">
                    <td className="py-2">{owner.name}</td>
                    <td className="py-2 text-muted-foreground">{owner.email}</td>
                    <td className="py-2">
                      <Badge variant={owner.active ? "success" : "secondary"}>
                        {owner.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
