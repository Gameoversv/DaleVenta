"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDenominationValue } from "@/components/cash-shift/DenominationCountGrid";
import { PageHeader } from "@/components/common/page-header";
import { PermissionDenied } from "@/components/common/permission-denied";
import { EmptyState, ErrorState } from "@/components/common/empty-state";
import type { TenantFeatures } from "@/types/auth";
import type { DenominationResponse } from "@/types/cash-shift";
import type { InvoicePrintSize, InvoiceSettingsResponse } from "@/types/settings";

type DenominationType = DenominationResponse["type"];

interface CreateDenominationForm {
  value: string;
  type: DenominationType;
}

async function fetchDenominations(): Promise<DenominationResponse[]> {
  const res = await api.get<{ data: DenominationResponse[] }>("/api/denominations");
  return res.data.data;
}

async function fetchInvoiceSettings(): Promise<InvoiceSettingsResponse> {
  const res = await api.get<{ data: InvoiceSettingsResponse }>("/api/settings/invoice");
  return normalizeInvoiceSettings(res.data.data);
}

async function fetchTenantFeatures(): Promise<TenantFeatures> {
  const res = await api.get<{ data: TenantFeatures }>("/api/fiscal/status");
  return res.data.data;
}

function denominationTypeLabel(type: DenominationType) {
  return type === "BILL" ? "Billete" : "Moneda";
}

function normalizeInvoiceSettings(raw: Partial<InvoiceSettingsResponse> & { name?: string } = {}): InvoiceSettingsResponse {
  return {
    businessName: raw.businessName ?? raw.name ?? "",
    rnc: raw.rnc ?? null,
    phone: raw.phone ?? null,
    email: raw.email ?? null,
    address: raw.address ?? null,
    city: raw.city ?? null,
    logoUrl: raw.logoUrl ?? null,
    footerMessage: raw.footerMessage ?? null,
    printSize: raw.printSize ?? "LETTER",
    showLogo: raw.showLogo ?? true,
    showRnc: raw.showRnc ?? true,
    showPhone: raw.showPhone ?? true,
    showEmail: raw.showEmail ?? true,
    showAddress: raw.showAddress ?? true,
    showCustomer: raw.showCustomer ?? true,
    showTax: raw.showTax ?? true,
  };
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

function InvoiceSettingsCard() {
  const queryClient = useQueryClient();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [form, setForm] = useState<InvoiceSettingsResponse | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoice-settings"],
    queryFn: fetchInvoiceSettings,
    enabled: invoiceOpen,
  });

  const values = form ?? (data ? normalizeInvoiceSettings(data) : null);
  const mutation = useMutation({
    mutationFn: (payload: InvoiceSettingsResponse) => api.put("/api/settings/invoice", normalizeInvoiceSettings(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-settings"] });
      queryClient.invalidateQueries({ queryKey: ["invoice"] });
      setForm(null);
      toast.success("Configuracion de factura guardada");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "No se pudo guardar la configuracion de factura";
      toast.error(message);
    },
  });

  const update = <K extends keyof InvoiceSettingsResponse>(key: K, value: InvoiceSettingsResponse[K]) => {
    setForm((current) => ({ ...normalizeInvoiceSettings(current ?? data), [key]: value }));
  };

  return (
    <Card>
      <CardHeader className="p-0">
        <button
          type="button"
          onClick={() => setInvoiceOpen((current) => !current)}
          className="flex w-full items-center justify-between p-6 text-left"
        >
          <CardTitle>Factura e impresion</CardTitle>
          {invoiceOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </CardHeader>
      {invoiceOpen && (
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando configuracion...</p>}
          {isError && <p className="text-sm text-destructive">No se pudo cargar la configuracion de factura.</p>}
          {values && (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate(values);
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoice-business-name">Nombre del negocio o local</Label>
                  <Input
                    id="invoice-business-name"
                    value={values.businessName}
                    onChange={(event) => update("businessName", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-phone">Telefono</Label>
                  <Input id="invoice-phone" value={values.phone ?? ""} onChange={(event) => update("phone", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-email">Email</Label>
                  <Input id="invoice-email" value={values.email ?? ""} onChange={(event) => update("email", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-address">Direccion</Label>
                  <Input id="invoice-address" value={values.address ?? ""} onChange={(event) => update("address", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-city">Ciudad</Label>
                  <Input id="invoice-city" value={values.city ?? ""} onChange={(event) => update("city", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-logo">URL del logo</Label>
                  <Input id="invoice-logo" value={values.logoUrl ?? ""} onChange={(event) => update("logoUrl", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-print-size">Tamano de impresion</Label>
                  <select
                    id="invoice-print-size"
                    value={values.printSize}
                    onChange={(event) => update("printSize", event.target.value as InvoicePrintSize)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="LETTER">Carta</option>
                    <option value="THERMAL_80MM">Ticket 80mm</option>
                    <option value="THERMAL_58MM">Ticket 58mm</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice-footer">Mensaje final</Label>
                <Input
                  id="invoice-footer"
                  value={values.footerMessage ?? ""}
                  onChange={(event) => update("footerMessage", event.target.value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["showLogo", "Mostrar logo"],
                  ["showPhone", "Mostrar telefono"],
                  ["showEmail", "Mostrar email"],
                  ["showAddress", "Mostrar direccion"],
                  ["showCustomer", "Mostrar cliente"],
                  ["showTax", "Mostrar impuesto"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(values[key as keyof InvoiceSettingsResponse])}
                      onChange={(event) =>
                        update(key as keyof InvoiceSettingsResponse, event.target.checked as never)
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>

              <Button type="submit" disabled={mutation.isPending || !values.businessName?.trim()}>
                <Save className="h-4 w-4" />
                {mutation.isPending ? "Guardando..." : "Guardar factura"}
              </Button>
            </form>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const canManageSettings = usePermission("SETTINGS_MANAGE");
  const canManageUsers = usePermission("USERS_MANAGE");
  const { data: tenantFeatures } = useQuery({
    queryKey: ["tenant-features"],
    queryFn: fetchTenantFeatures,
    enabled: canManageSettings,
  });
  const cashDenominationsEnabled = tenantFeatures?.cashDenominationsEnabled === true;
  const {
    data: denominations,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["denominations"],
    queryFn: fetchDenominations,
    enabled: canManageSettings && cashDenominationsEnabled,
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

  if (!canManageSettings && !canManageUsers) {
    return (
      <PermissionDenied
        title="Configuracion"
        message="No tienes permiso para administrar configuracion o usuarios."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuracion"
        actions={canManageSettings && cashDenominationsEnabled && <CreateDenominationDialog />}
      />

      {canManageSettings && <InvoiceSettingsCard />}

      {canManageSettings && cashDenominationsEnabled && (
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
              {isError && <ErrorState message="No se pudieron cargar las denominaciones." />}
              {!isLoading && !isError && orderedDenominations.length === 0 && (
                <EmptyState message="No hay denominaciones activas. Crea al menos una para poder contar efectivo en caja." />
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
      )}

      {canManageUsers && (
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
      )}
    </div>
  );
}
