"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import type { TenantModule } from "./tenant-modules";

interface TenantModuleToggleProps {
  tenantId: string;
  module: TenantModule;
  enabled: boolean;
}

function actionLabel(isPending: boolean, enabled: boolean): string {
  if (isPending) return "Actualizando...";
  return enabled ? "Desactivar" : "Activar";
}

/**
 * One optional module, with the switch that turns it on or off for this tenant.
 *
 * The mutation lives here rather than in the page because there is one per module: hoisting them
 * would mean six hooks in the page, and a seventh module would mean a seventh. The tenant list is
 * invalidated alongside the detail since the same flags decide what that table shows.
 */
export function TenantModuleToggle({ tenantId, module, enabled }: Readonly<TenantModuleToggleProps>) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (nextEnabled: boolean) =>
      api.patch(`/api/super-admin/tenants/${tenantId}/${module.path}`, { enabled: nextEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-tenant", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["sa-tenants"] });
      toast.success(module.successMessage);
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err)),
  });

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{module.title}</p>
          <p className="text-xs text-muted-foreground">{module.description}</p>
        </div>
        <Button
          type="button"
          variant={enabled ? "secondary" : "default"}
          size="sm"
          onClick={() => mutation.mutate(!enabled)}
          disabled={mutation.isPending}
        >
          {actionLabel(mutation.isPending, enabled)}
        </Button>
      </div>
    </div>
  );
}
