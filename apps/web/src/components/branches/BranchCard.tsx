"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Pencil, Plus, Power } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { BranchFormDialog } from "./BranchFormDialog";
import { DeactivateBranchDialog } from "./DeactivateBranchDialog";
import { RegisterFormDialog } from "./RegisterFormDialog";
import type { BranchResponse, RegisterResponse } from "@/types/branch";

async function fetchRegisters(branchId: string): Promise<RegisterResponse[]> {
  const res = await api.get<{ data: RegisterResponse[] }>("/api/registers", { params: { branchId } });
  return res.data.data;
}

export function BranchCard({
  branch,
  multiRegisterEnabled,
}: {
  branch: BranchResponse;
  multiRegisterEnabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const { data: registers, isLoading } = useQuery({
    queryKey: ["registers", branch.id],
    queryFn: () => fetchRegisters(branch.id),
    enabled: expanded,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-left"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <div>
            <p className="font-semibold">{branch.name}</p>
            {branch.address && <p className="text-sm text-muted-foreground">{branch.address}</p>}
          </div>
        </button>
        <div className="flex items-center gap-2">
          <BranchFormDialog
            branch={branch}
            trigger={
              <Button variant="outline" size="icon" aria-label="Editar sucursal">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <DeactivateBranchDialog
            branch={branch}
            trigger={
              <Button variant="outline" size="icon" aria-label="Desactivar sucursal">
                <Power className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando cajas...</p>}
          {registers && registers.length === 0 && (
            <p className="text-sm text-muted-foreground">Esta sucursal no tiene cajas todavia.</p>
          )}
          {registers && registers.length > 0 && (
            <ul className="space-y-2">
              {registers.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-sm">{r.name}</span>
                  <RegisterFormDialog
                    branchId={branch.id}
                    register={r}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Editar ${r.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          {(multiRegisterEnabled || (registers?.length ?? 0) === 0) ? (
            <RegisterFormDialog
              branchId={branch.id}
              trigger={
                <Button variant="secondary" size="sm" className="mt-3">
                  <Plus className="h-4 w-4" />
                  Nueva caja
                </Button>
              }
            />
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Multicaja no esta activo para este tenant. Solo se permite una caja por sucursal.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
