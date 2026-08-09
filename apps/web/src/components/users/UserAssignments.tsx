"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/empty-state";
import type { UserAssignments, UserResponse } from "@/types/auth";
import type { BranchResponse, RegisterResponse } from "@/types/branch";

/**
 * Which branches and registers a cashier may operate. Lives outside the users page so the rules
 * that decide a cashier's reach can be tested on their own.
 */

async function fetchBranches(): Promise<BranchResponse[]> {
  const res = await api.get<{ data: BranchResponse[] }>("/api/branches");
  return res.data.data;
}

async function fetchRegisters(branches: BranchResponse[]): Promise<RegisterResponse[]> {
  const results = await Promise.all(
    branches.map(async (branch) => {
      const res = await api.get<{ data: RegisterResponse[] }>("/api/registers", { params: { branchId: branch.id } });
      return res.data.data;
    })
  );
  return results.flat();
}

async function fetchAssignments(userId: string): Promise<UserAssignments> {
  const res = await api.get<{ data: UserAssignments }>(`/api/users/${userId}/assignments`);
  return res.data.data;
}

const EMPTY_ASSIGNMENTS: UserAssignments = { branchIds: [], registerIds: [] };

export function UserAssignmentsSummary({ user }: Readonly<{ user: UserResponse }>) {
  const { data: assignments, isLoading, isError } = useQuery({
    queryKey: ["user-assignments", user.id],
    queryFn: () => fetchAssignments(user.id),
    enabled: user.role === "CASHIER",
  });

  if (user.role !== "CASHIER") return <span className="text-muted-foreground">Sin restriccion</span>;
  if (isLoading) return <span className="text-muted-foreground">Cargando...</span>;
  if (isError) return <span className="text-destructive">No disponible</span>;
  if (!assignments || assignments.branchIds.length === 0 || assignments.registerIds.length === 0) {
    return <span className="font-medium text-amber-700">Sin asignaciones</span>;
  }

  const branchLabel = `${assignments.branchIds.length} ${assignments.branchIds.length === 1 ? "sucursal" : "sucursales"}`;
  const registerLabel = `${assignments.registerIds.length} ${assignments.registerIds.length === 1 ? "caja" : "cajas"}`;
  return <span>{branchLabel} · {registerLabel}</span>;
}

export function UserAssignmentsDialog({ user }: Readonly<{ user: UserResponse }>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<UserAssignments | null>(null);
  const queryClient = useQueryClient();
  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ["assignment-branches"],
    queryFn: fetchBranches,
    enabled: open,
  });
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["user-assignments", user.id],
    queryFn: () => fetchAssignments(user.id),
    enabled: open,
  });
  const { data: registers, isLoading: registersLoading } = useQuery({
    queryKey: ["assignment-registers", branches?.map((branch) => branch.id)],
    queryFn: () => fetchRegisters(branches ?? []),
    enabled: open && branches !== undefined,
  });

  const values = draft ?? assignments ?? EMPTY_ASSIGNMENTS;
  const selectedBranchIds = new Set(values.branchIds);
  const selectedRegisterIds = new Set(values.registerIds);
  const registersById = new Map((registers ?? []).map((register) => [register.id, register]));

  const mutation = useMutation({
    mutationFn: (next: UserAssignments) => api.put(`/api/users/${user.id}/assignments`, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-assignments", user.id] });
      setDraft(null);
      setOpen(false);
      toast.success("Asignaciones actualizadas");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "No se pudieron actualizar las asignaciones";
      toast.error(message);
    },
  });

  const update = (next: UserAssignments) => setDraft(next);

  const toggleBranch = (branchId: string) => {
    if (selectedBranchIds.has(branchId)) {
      update({
        branchIds: values.branchIds.filter((id) => id !== branchId),
        registerIds: values.registerIds.filter((id) => registersById.get(id)?.branchId !== branchId),
      });
      return;
    }
    update({ ...values, branchIds: [...values.branchIds, branchId] });
  };

  const toggleRegister = (registerId: string) => {
    update({
      ...values,
      registerIds: selectedRegisterIds.has(registerId)
        ? values.registerIds.filter((id) => id !== registerId)
        : [...values.registerIds, registerId],
    });
  };

  const isLoading = branchesLoading || assignmentsLoading || registersLoading;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setDraft(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Asignar sucursales y cajas">
          <Building2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sucursales y cajas de {user.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            El cajero solo podra ver y operar las sucursales y cajas seleccionadas. Una caja requiere que su sucursal tambien este asignada.
          </p>
          {isLoading && <p className="text-muted-foreground">Cargando asignaciones...</p>}
          {!isLoading && branches?.length === 0 && <EmptyState message="No hay sucursales activas para asignar." />}
          {!isLoading && branches && branches.length > 0 && (
            <div className="space-y-3">
              {branches.map((branch) => {
                const branchRegisters = (registers ?? []).filter((register) => register.branchId === branch.id);
                return (
                  <div key={branch.id} className="rounded-lg border border-border p-3">
                    <label className="flex cursor-pointer items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={selectedBranchIds.has(branch.id)}
                        onChange={() => toggleBranch(branch.id)}
                      />
                      {branch.name}
                    </label>
                    {selectedBranchIds.has(branch.id) && (
                      <div className="mt-3 space-y-2 border-l border-border pl-4">
                        {branchRegisters.length === 0 && <p className="text-xs text-muted-foreground">Sin cajas activas.</p>}
                        {branchRegisters.map((register) => (
                          <label key={register.id} className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedRegisterIds.has(register.id)}
                              onChange={() => toggleRegister(register.id)}
                            />
                            {register.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate(values)} disabled={isLoading || mutation.isPending}>
            {mutation.isPending ? "Guardando..." : "Guardar asignaciones"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
