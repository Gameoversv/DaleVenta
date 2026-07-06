"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDenominationValue } from "@/components/cash-shift/DenominationCountGrid";
import type { DenominationResponse } from "@/types/cash-shift";

type DenominationType = DenominationResponse["type"];

interface CreateDenominationForm {
  value: string;
  type: DenominationType;
}

async function fetchDenominations(): Promise<DenominationResponse[]> {
  const res = await api.get<{ data: DenominationResponse[] }>("/api/denominations");
  return res.data.data;
}

function denominationTypeLabel(type: DenominationType) {
  return type === "BILL" ? "Billete" : "Moneda";
}

function CreateDenominationDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateDenominationForm>({ value: "", type: "BILL" });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CreateDenominationForm) =>
      api.post("/api/denominations", {
        value: values.value,
        type: values.type,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["denominations"] });
      setForm({ value: "", type: "BILL" });
      setOpen(false);
      toast.success("Denominacion creada");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "No se pudo crear la denominacion";
      toast.error(message);
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(form.value);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("El valor debe ser mayor que cero");
      return;
    }

    mutation.mutate({ ...form, value: amount.toFixed(2) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nueva denominacion
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva denominacion</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="denomination-value">Valor</Label>
            <Input
              id="denomination-value"
              type="number"
              min="0.01"
              step="0.01"
              value={form.value}
              onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="denomination-type">Tipo</Label>
            <select
              id="denomination-type"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value as DenominationType }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="BILL">Billete</option>
              <option value="COIN">Moneda</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsPage() {
  const canManageSettings = usePermission("SETTINGS_MANAGE");
  const {
    data: denominations,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["denominations"],
    queryFn: fetchDenominations,
    enabled: canManageSettings,
  });

  const [denominationsOpen, setDenominationsOpen] = useState(false);

  const orderedDenominations = useMemo(
    () =>
      [...(denominations ?? [])].sort((a, b) => {
        if (a.type !== b.type) return a.type === "BILL" ? -1 : 1;
        return Number(b.value) - Number(a.value);
      }),
    [denominations]
  );

  if (!canManageSettings) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Configuracion</h1>
        <p className="text-muted-foreground">No tienes permiso para administrar la configuracion.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Configuracion</h1>
        <CreateDenominationDialog />
      </div>

      <Card>
        <button
          type="button"
          onClick={() => setDenominationsOpen((v) => !v)}
          className="flex w-full items-center justify-between p-6 text-left"
        >
          <CardTitle>Denominaciones de caja</CardTitle>
          {denominationsOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {denominationsOpen && (
        <CardContent className="pt-0">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando denominaciones...</p>}
          {isError && <p className="text-sm text-destructive">No se pudieron cargar las denominaciones.</p>}
          {!isLoading && !isError && orderedDenominations.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No hay denominaciones activas. Crea al menos una para poder contar efectivo en caja.
            </p>
          )}
          {orderedDenominations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Valor</th>
                    <th className="py-2 pr-4 font-medium">Tipo</th>
                    <th className="py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedDenominations.map((denomination) => (
                    <tr key={denomination.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-medium">{formatDenominationValue(denomination.value)}</td>
                      <td className="py-3 pr-4">{denominationTypeLabel(denomination.type)}</td>
                      <td className="py-3">{denomination.active ? "Activa" : "Inactiva"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios y permisos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Administra usuarios internos, roles y accesos al sistema.</p>
          <Button asChild variant="outline">
            <Link href="/settings/users">Abrir usuarios</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
