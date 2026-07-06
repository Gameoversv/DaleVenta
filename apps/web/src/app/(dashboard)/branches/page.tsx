"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { BranchCard } from "@/components/branches/BranchCard";
import { BranchFormDialog } from "@/components/branches/BranchFormDialog";
import type { BranchResponse } from "@/types/branch";

async function fetchBranches(): Promise<BranchResponse[]> {
  const res = await api.get<{ data: BranchResponse[] }>("/api/branches");
  return res.data.data;
}

export default function BranchesPage() {
  const canManageSettings = usePermission("SETTINGS_MANAGE");
  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    enabled: canManageSettings,
  });

  if (!canManageSettings) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Sucursales</h1>
        <p className="text-sm text-muted-foreground">No tienes permiso para administrar sucursales.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sucursales</h1>
        <BranchFormDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              Nueva sucursal
            </Button>
          }
        />
      </div>
      {isLoading && <p className="text-muted-foreground">Cargando sucursales...</p>}
      {branches && branches.length === 0 && (
        <p className="text-muted-foreground">No hay sucursales todavia. Crea la primera.</p>
      )}
      <div className="space-y-3">
        {branches?.map((branch) => (
          <BranchCard key={branch.id} branch={branch} />
        ))}
      </div>
    </div>
  );
}
