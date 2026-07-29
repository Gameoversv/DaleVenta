"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/lib/auth-context";
import { BranchCard } from "@/components/branches/BranchCard";
import { BranchFormDialog } from "@/components/branches/BranchFormDialog";
import { PageHeader } from "@/components/common/page-header";
import { PermissionDenied } from "@/components/common/permission-denied";
import { EmptyState } from "@/components/common/empty-state";
import type { BranchResponse } from "@/types/branch";

async function fetchBranches(): Promise<BranchResponse[]> {
  const res = await api.get<{ data: BranchResponse[] }>("/api/branches");
  return res.data.data;
}

export default function BranchesPage() {
  const canManageSettings = usePermission("SETTINGS_MANAGE");
  const { tenantFeatures } = useAuth();
  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    enabled: canManageSettings,
  });
  const canCreateBranch = tenantFeatures.multiBranchEnabled || (branches?.length ?? 0) === 0;

  if (!canManageSettings) {
    return <PermissionDenied title="Sucursales" message="No tienes permiso para administrar sucursales." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sucursales"
        actions={
          canCreateBranch && (
            <BranchFormDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Nueva sucursal
                </Button>
              }
            />
          )
        }
      />
      {!tenantFeatures.multiBranchEnabled && (branches?.length ?? 0) > 0 && (
        <p className="text-sm text-muted-foreground">
          Multisucursal no esta activo para este tenant. Solo se permite una sucursal.
        </p>
      )}
      {isLoading && <p className="text-muted-foreground">Cargando sucursales...</p>}
      {branches && branches.length === 0 && <EmptyState message="No hay sucursales todavia. Crea la primera." />}
      <div className="space-y-3">
        {branches?.map((branch) => (
          <BranchCard key={branch.id} branch={branch} multiRegisterEnabled={tenantFeatures.multiRegisterEnabled} />
        ))}
      </div>
    </div>
  );
}
