"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ImpersonateResponse, TenantDetailResponse, TenantStatus } from "@/types/superadmin";
import { TenantInfoCard } from "./TenantInfoCard";
import { TenantOwnersTable } from "./TenantOwnersTable";
import { TenantStatusPlanCard } from "./TenantStatusPlanCard";

async function fetchTenant(id: string): Promise<TenantDetailResponse> {
  const res = await api.get<{ data: TenantDetailResponse }>(`/api/super-admin/tenants/${id}`);
  return res.data.data;
}

const STATUS_VARIANT: Record<TenantStatus, "warning" | "info" | "success" | "danger" | "secondary"> = {
  PENDING: "warning",
  TRIAL: "info",
  ACTIVE: "success",
  SUSPENDED: "danger",
  CANCELLED: "secondary",
};

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
    onError: (err: unknown) => toast.error(apiErrorMessage(err)),
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
    onError: (err: unknown) => toast.error(apiErrorMessage(err)),
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
        <TenantInfoCard tenant={tenant} />
        <TenantStatusPlanCard tenant={tenant} />
      </div>

      <TenantOwnersTable owners={tenant.owners} />
    </div>
  );
}
