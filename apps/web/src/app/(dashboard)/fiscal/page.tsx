"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/page-header";
import { PermissionDenied } from "@/components/common/permission-denied";
import { ModuleDisabled } from "@/components/common/module-disabled";
import { EmptyState } from "@/components/common/empty-state";
import type { TenantFeatures } from "@/types/auth";
import type { FiscalProfile, FiscalReceiptSequence, FiscalReceiptType } from "@/types/fiscal";
import { fiscalError, normalizeFiscalProfile, sequencePayload, type SequenceForm } from "@/lib/fiscal";

const receiptTypeLabels: Record<FiscalReceiptType, string> = {
  B01: "Credito fiscal",
  B02: "Consumidor final",
  B14: "Regimen especial",
  B15: "Gubernamental",
};

const emptyProfile: FiscalProfile = {
  businessName: "",
  tradeName: "",
  rnc: "",
  fiscalAddress: "",
  phone: "",
  email: "",
  taxRegime: "",
};


const defaultSequenceForm: SequenceForm = {
  receiptType: "B01",
  prefix: "B01",
  startNumber: "1",
  nextNumber: "1",
  endNumber: "100",
  expiresAt: "",
  active: true,
};

async function fetchFiscalStatus(): Promise<TenantFeatures> {
  const res = await api.get<{ data: TenantFeatures }>("/api/fiscal/status");
  return res.data.data;
}

async function fetchFiscalProfile(): Promise<FiscalProfile> {
  const res = await api.get<{ data: FiscalProfile }>("/api/fiscal/profile");
  return normalizeFiscalProfile(res.data.data);
}

async function fetchSequences(): Promise<FiscalReceiptSequence[]> {
  const res = await api.get<{ data: FiscalReceiptSequence[] }>("/api/fiscal/sequences");
  return res.data.data ?? [];
}




function FiscalProfileCard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["fiscal-profile"], queryFn: fetchFiscalProfile });
  const [form, setForm] = useState<FiscalProfile | null>(null);
  const values = form ?? data ?? emptyProfile;

  const mutation = useMutation({
    mutationFn: (payload: FiscalProfile) => api.put("/api/fiscal/profile", normalizeFiscalProfile(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-profile"] });
      setForm(null);
      toast.success("Datos fiscales guardados");
    },
    onError: (err: unknown) => toast.error(fiscalError(err, "No se pudieron guardar los datos fiscales")),
  });

  const update = <K extends keyof FiscalProfile>(key: K, value: FiscalProfile[K]) => {
    setForm((current) => ({ ...normalizeFiscalProfile(current ?? data), [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos fiscales del negocio</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Cargando datos fiscales...</p>}
        {isError && <p className="text-sm text-destructive">No se pudieron cargar los datos fiscales.</p>}
        {!isLoading && !isError && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(values);
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fiscal-business-name">Razon social</Label>
                <Input
                  id="fiscal-business-name"
                  value={values.businessName}
                  onChange={(event) => update("businessName", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiscal-trade-name">Nombre comercial</Label>
                <Input
                  id="fiscal-trade-name"
                  value={values.tradeName ?? ""}
                  onChange={(event) => update("tradeName", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiscal-rnc">RNC</Label>
                <Input id="fiscal-rnc" value={values.rnc} onChange={(event) => update("rnc", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiscal-tax-regime">Regimen tributario</Label>
                <Input
                  id="fiscal-tax-regime"
                  value={values.taxRegime ?? ""}
                  onChange={(event) => update("taxRegime", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiscal-phone">Telefono</Label>
                <Input id="fiscal-phone" value={values.phone ?? ""} onChange={(event) => update("phone", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiscal-email">Email fiscal</Label>
                <Input id="fiscal-email" value={values.email ?? ""} onChange={(event) => update("email", event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscal-address">Direccion fiscal</Label>
              <Input
                id="fiscal-address"
                value={values.fiscalAddress ?? ""}
                onChange={(event) => update("fiscalAddress", event.target.value)}
              />
            </div>
            <Button type="submit" disabled={mutation.isPending || !values.businessName.trim() || !values.rnc.trim()}>
              <Save className="h-4 w-4" />
              {mutation.isPending ? "Guardando..." : "Guardar datos fiscales"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function SequenceDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SequenceForm>(defaultSequenceForm);

  const mutation = useMutation({
    mutationFn: (payload: SequenceForm) => api.post("/api/fiscal/sequences", sequencePayload(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-sequences"] });
      setForm(defaultSequenceForm);
      setOpen(false);
      toast.success("Secuencia NCF creada");
    },
    onError: (err: unknown) => toast.error(fiscalError(err, "No se pudo crear la secuencia")),
  });

  const updateType = (receiptType: FiscalReceiptType) => {
    setForm((current) => ({ ...current, receiptType, prefix: receiptType }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nueva secuencia
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva secuencia NCF</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(form);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sequence-type">Tipo</Label>
              <select
                id="sequence-type"
                value={form.receiptType}
                onChange={(event) => updateType(event.target.value as FiscalReceiptType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(receiptTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {value} - {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sequence-prefix">Prefijo</Label>
              <Input
                id="sequence-prefix"
                value={form.prefix}
                onChange={(event) => setForm((current) => ({ ...current, prefix: event.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sequence-start">Inicial</Label>
              <Input
                id="sequence-start"
                type="number"
                min="1"
                value={form.startNumber}
                onChange={(event) => setForm((current) => ({ ...current, startNumber: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sequence-next">Proximo</Label>
              <Input
                id="sequence-next"
                type="number"
                min="1"
                value={form.nextNumber}
                onChange={(event) => setForm((current) => ({ ...current, nextNumber: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sequence-end">Final</Label>
              <Input
                id="sequence-end"
                type="number"
                min="1"
                value={form.endNumber}
                onChange={(event) => setForm((current) => ({ ...current, endNumber: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sequence-expiration">Vencimiento</Label>
              <Input
                id="sequence-expiration"
                type="date"
                value={form.expiresAt}
                onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
            />
            Secuencia activa
          </label>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !form.expiresAt}>
              {mutation.isPending ? "Guardando..." : "Crear secuencia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SequencesCard() {
  const { data = [], isLoading, isError } = useQuery({ queryKey: ["fiscal-sequences"], queryFn: fetchSequences });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Secuencias NCF</CardTitle>
        <SequenceDialog />
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Cargando secuencias...</p>}
        {isError && <p className="text-sm text-destructive">No se pudieron cargar las secuencias.</p>}
        {!isLoading && !isError && data.length === 0 && (
          <EmptyState message="No hay secuencias configuradas." />
        )}
        {data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 pr-4 font-medium">Proximo NCF</th>
                  <th className="py-2 pr-4 font-medium">Rango</th>
                  <th className="py-2 pr-4 font-medium">Restantes</th>
                  <th className="py-2 pr-4 font-medium">Vence</th>
                  <th className="py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.map((sequence) => (
                  <tr key={sequence.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{sequence.receiptType}</div>
                      <div className="text-xs text-muted-foreground">{receiptTypeLabels[sequence.receiptType]}</div>
                    </td>
                    <td className="py-3 pr-4 font-medium">{sequence.nextNcf}</td>
                    <td className="py-3 pr-4">
                      {sequence.startNumber} - {sequence.endNumber}
                    </td>
                    <td className="py-3 pr-4">{sequence.remaining}</td>
                    <td className="py-3 pr-4">{sequence.expiresAt}</td>
                    <td className="py-3">
                      <Badge variant={sequence.active ? "success" : "outline"}>
                        {sequence.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FiscalPage() {
  const { tenantFeatures, user } = useAuth();
  const { data: fiscalStatus, isLoading } = useQuery({
    queryKey: ["fiscal-status"],
    queryFn: fetchFiscalStatus,
    enabled: user?.role === "ADMIN",
  });

  const fiscalModuleEnabled = fiscalStatus?.fiscalModuleEnabled ?? tenantFeatures.fiscalModuleEnabled;

  if (user?.role !== "ADMIN") {
    return <PermissionDenied title="Fiscal" message="Solo un administrador puede acceder al modulo fiscal." />;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <PageHeader title="Fiscal" />
        <p className="text-sm text-muted-foreground">Confirmando estado del modulo fiscal...</p>
      </div>
    );
  }

  if (!fiscalModuleEnabled) {
    return <ModuleDisabled title="Fiscal" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fiscal" description="RNC, comprobantes fiscales, secuencias NCF y factura fiscal." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Modulo fiscal activo
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Configura los datos fiscales y las secuencias antes de emitir facturas con comprobante.
        </CardContent>
      </Card>

      <FiscalProfileCard />
      <SequencesCard />
    </div>
  );
}
