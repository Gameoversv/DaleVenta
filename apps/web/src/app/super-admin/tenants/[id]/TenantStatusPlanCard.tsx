"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { TenantDetailResponse, TenantPlan, TenantStatus } from "@/types/superadmin";
import { ExtendTrialDialog } from "./ExtendTrialDialog";
import { TenantModuleToggle } from "./TenantModuleToggle";
import { TENANT_MODULES, isModuleEnabled } from "./tenant-modules";

const STATUSES: TenantStatus[] = ["PENDING", "TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"];
const PLANS: TenantPlan[] = ["STARTER", "PRO", "ENTERPRISE"];

const SELECT_CLASS = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

/** Everything about the tenant that this screen can change. */
export function TenantStatusPlanCard({ tenant }: Readonly<{ tenant: TenantDetailResponse }>) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["sa-tenant", tenant.id] });

  const statusMutation = useMutation({
    mutationFn: (status: TenantStatus) =>
      api.patch(`/api/super-admin/tenants/${tenant.id}/status`, { status }),
    onSuccess: () => {
      invalidate();
      toast.success("Estado actualizado");
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err)),
  });

  const planMutation = useMutation({
    mutationFn: (plan: TenantPlan) => api.patch(`/api/super-admin/tenants/${tenant.id}/plan`, { plan }),
    onSuccess: () => {
      invalidate();
      toast.success("Plan actualizado");
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err)),
  });

  return (
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
            onChange={(event) => statusMutation.mutate(event.target.value as TenantStatus)}
            disabled={statusMutation.isPending}
            className={SELECT_CLASS}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-plan">Plan</Label>
          <select
            id="tenant-plan"
            value={tenant.plan}
            onChange={(event) => planMutation.mutate(event.target.value as TenantPlan)}
            disabled={planMutation.isPending}
            className={SELECT_CLASS}
          >
            {PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
        </div>
        {TENANT_MODULES.map((module) => (
          <TenantModuleToggle
            key={module.key}
            tenantId={tenant.id}
            module={module}
            enabled={isModuleEnabled(tenant, module)}
          />
        ))}
        <ExtendTrialDialog tenantId={tenant.id} />
      </CardContent>
    </Card>
  );
}
