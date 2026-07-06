"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Banknote, Calculator, DollarSign, LockKeyhole, Printer } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { useSoleBranch } from "@/hooks/useSoleBranch";
import { useSoleRegister } from "@/hooks/useSoleRegister";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentMethodBadge } from "@/components/ui/payment-method-badge";
import { cn } from "@/lib/utils";
import type { DailyCloseReportResponse, DailyClosingResponse } from "@/types/report";

const TONES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
} as const;

async function fetchDailyClose(date: string, registerId: string): Promise<DailyCloseReportResponse> {
  const res = await api.get<{ data: DailyCloseReportResponse }>("/api/reports/daily-close", {
    params: { date, registerId: registerId || undefined },
  });
  return res.data.data;
}

async function fetchDailyClosings(): Promise<DailyClosingResponse[]> {
  const res = await api.get<{ data: DailyClosingResponse[] }>("/api/reports/daily-closings");
  return res.data.data;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function money(value: string | number): string {
  const amount = Number(value ?? 0);
  return `RD$${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
}

function dateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "-";
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fieldValue(record: unknown, names: string[], fallback: string | number = 0): string | number {
  const source = record as Record<string, unknown> | null | undefined;
  for (const name of names) {
    const value = source?.[name];
    if (value !== undefined && value !== null && value !== "") {
      return value as string | number;
    }
  }
  return fallback;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  tone: keyof typeof TONES;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-mono-money text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DailyCloseReportPage() {
  const canViewReports = usePermission("REPORTS_VIEW");
  const queryClient = useQueryClient();
  const today = useMemo(() => isoDate(new Date()), []);
  const [date, setDate] = useState(today);
  const [manualBranchId, setManualBranchId] = useState("");
  const [manualRegisterId, setManualRegisterId] = useState("");
  const { branches, hasMultiple: hasMultipleBranches, soleBranchId } = useSoleBranch();
  const branchId = hasMultipleBranches ? manualBranchId : soleBranchId;
  const {
    registers,
    isLoading: registersLoading,
    hasMultiple: hasMultipleRegisters,
    soleRegisterId,
  } = useSoleRegister(branchId);
  const registerId = hasMultipleRegisters ? manualRegisterId : soleRegisterId;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["daily-close", date, registerId],
    queryFn: () => fetchDailyClose(date, registerId),
    enabled: canViewReports && !!date,
  });
  const { data: closings } = useQuery({
    queryKey: ["daily-closings"],
    queryFn: fetchDailyClosings,
    enabled: canViewReports,
  });
  const saveClosing = useMutation({
    mutationFn: () =>
      api.post<{ data: DailyClosingResponse }>("/api/reports/daily-close", null, {
        params: { date, registerId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-closings"] });
      toast.success("Cierre diario guardado");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "No se pudo guardar el cierre diario";
      toast.error(message);
    },
  });
  const closingSaved = (closings ?? []).some((closing) => closing.closeDate === date && closing.registerId === registerId);

  if (!canViewReports) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Cierre diario</h1>
        <p className="text-muted-foreground">No tienes permiso para consultar reportes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Cierre diario</h1>
          <p className="text-sm text-muted-foreground">{data ? data.registerName : "Resumen operativo del dia"}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="daily-close-date">Fecha</Label>
            <Input id="daily-close-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          {hasMultipleBranches && (
            <div className="space-y-2">
              <Label htmlFor="daily-close-branch">Sucursal</Label>
              <select
                id="daily-close-branch"
                value={manualBranchId}
                onChange={(event) => {
                  setManualBranchId(event.target.value);
                  setManualRegisterId("");
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          )}
          {hasMultipleRegisters && (
            <div className="space-y-2">
              <Label htmlFor="daily-close-register">Caja</Label>
              <select
                id="daily-close-register"
                value={manualRegisterId}
                onChange={(event) => setManualRegisterId(event.target.value)}
                disabled={!branchId || registersLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{registersLoading ? "Cargando cajas..." : "Todas"}</option>
                {registers.map((register) => (
                  <option key={register.id} value={register.id}>{register.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button onClick={() => refetch()} disabled={isFetching || !date}>
            <BarChart3 className="h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={() => window.print()} disabled={!data}>
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => saveClosing.mutate()}
            disabled={!data || !registerId || closingSaved || saveClosing.isPending}
          >
            <LockKeyhole className="h-4 w-4" />
            {closingSaved ? "Guardado" : saveClosing.isPending ? "Guardando..." : "Guardar cierre"}
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground print:hidden">Cargando cierre...</p>}
      {isError && <p className="text-sm text-destructive print:hidden">No se pudo cargar el cierre diario.</p>}

      {data && (
        <section className="space-y-6 print:space-y-4">
          <div className="hidden border-b pb-3 print:block">
            <h1 className="text-2xl font-bold">Cierre diario</h1>
            <p>{data.date} - {data.registerName}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Ingresos" value={money(fieldValue(data, ["grossRevenue", "revenue", "totalRevenue", "salesTotal"]))} icon={DollarSign} tone="primary" />
            <MetricCard label="Efectivo esperado" value={money(fieldValue(data, ["cashExpected", "expectedCash"]))} icon={Banknote} tone="success" />
            <MetricCard label="Efectivo contado" value={money(fieldValue(data, ["cashCounted", "countedCash"]))} icon={Calculator} tone="info" />
            <MetricCard label="Diferencia" value={money(fieldValue(data, ["cashDifference", "difference"]))} icon={Calculator} tone="warning" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <p>Ventas completadas: <span className="font-medium">{numberValue(fieldValue(data, ["completedSales", "salesCount"]))}</span></p>
                <p>Ventas anuladas: <span className="font-medium">{numberValue(fieldValue(data, ["voidedSales", "cancelledSales"]))}</span></p>
                <p>Impuesto: <span className="font-mono-money font-medium">{money(fieldValue(data, ["taxTotal", "tax"]))}</span></p>
                <p>Descuento: <span className="font-mono-money font-medium">{money(fieldValue(data, ["discountTotal", "discountAmount", "discount"]))}</span></p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pagos</CardTitle>
              </CardHeader>
              <CardContent>
                {(data.payments ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay pagos para esta fecha.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2">Metodo</th>
                        <th className="py-2 text-right">Pagos</th>
                        <th className="py-2 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.payments ?? []).map((payment) => (
                        <tr key={payment.method} className="border-b last:border-b-0">
                          <td className="py-2"><PaymentMethodBadge method={payment.method} /></td>
                          <td className="py-2 text-right">{numberValue(fieldValue(payment, ["count", "paymentsCount"]))}</td>
                          <td className="py-2 text-right font-mono-money">{money(fieldValue(payment, ["amount", "total"]))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Turnos incluidos</CardTitle>
            </CardHeader>
            <CardContent>
              {(data.shifts ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay turnos abiertos en esta fecha.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2">Estado</th>
                        <th className="py-2">Apertura</th>
                        <th className="py-2">Cierre</th>
                        <th className="py-2 text-right">Esperado</th>
                        <th className="py-2 text-right">Contado</th>
                        <th className="py-2 text-right">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.shifts ?? []).map((shift) => (
                        <tr key={shift.id} className="border-b last:border-b-0">
                          <td className="py-2">{shift.status}</td>
                          <td className="py-2">{dateTime(shift.openedAt)}</td>
                          <td className="py-2">{dateTime(shift.closedAt)}</td>
                          <td className="py-2 text-right font-mono-money">{money(fieldValue(shift, ["expectedCash", "cashExpected"]))}</td>
                          <td className="py-2 text-right font-mono-money">{money(fieldValue(shift, ["countedCash", "cashCounted"]))}</td>
                          <td className="py-2 text-right font-mono-money">{money(fieldValue(shift, ["cashDifference", "difference"]))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>Cierres guardados</CardTitle>
            </CardHeader>
            <CardContent>
              {(closings ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavia no hay cierres diarios guardados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2">No.</th>
                        <th className="py-2">Fecha</th>
                        <th className="py-2">Caja</th>
                        <th className="py-2">Usuario</th>
                        <th className="py-2 text-right">Ingresos</th>
                        <th className="py-2 text-right">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(closings ?? []).slice(0, 20).map((closing) => (
                        <tr key={closing.id} className="border-b last:border-b-0">
                          <td className="py-2 font-medium">{closing.closeNumber}</td>
                          <td className="py-2">{closing.closeDate}</td>
                          <td className="py-2">{closing.registerName}</td>
                          <td className="py-2">{closing.closedByName}</td>
                          <td className="py-2 text-right font-mono-money">{money(closing.grossRevenue)}</td>
                          <td className="py-2 text-right font-mono-money">{money(closing.cashDifference)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
