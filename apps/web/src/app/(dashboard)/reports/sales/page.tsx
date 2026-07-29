"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, DollarSign, Receipt, Ticket, XCircle } from "lucide-react";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentMethodBadge } from "@/components/ui/payment-method-badge";
import { PageHeader } from "@/components/common/page-header";
import { PermissionDenied } from "@/components/common/permission-denied";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";
import type { SalesReportResponse } from "@/types/report";
import { moneyOrZero } from "@/lib/money";

type ReportTab = "weekly" | "custom";

const METRIC_TONES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  danger: "bg-destructive/10 text-destructive",
} as const;

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  tone: keyof typeof METRIC_TONES;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", METRIC_TONES[tone])}>
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

async function fetchSalesReport(from: string, to: string): Promise<SalesReportResponse> {
  const res = await api.get<{ data: SalesReportResponse }>("/api/reports/sales", { params: { from, to } });
  return res.data.data;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}


function dateLabel(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
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

export default function SalesReportPage() {
  const canViewReports = usePermission("REPORTS_VIEW");
  const defaultDates = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 6);
    return { from: isoDate(from), to: isoDate(to) };
  }, []);
  const [activeTab, setActiveTab] = useState<ReportTab>("weekly");
  const [customFrom, setCustomFrom] = useState(defaultDates.from);
  const [customTo, setCustomTo] = useState(defaultDates.to);
  const [customRange, setCustomRange] = useState(defaultDates);
  const activeRange = activeTab === "weekly" ? defaultDates : customRange;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["sales-report", activeTab, activeRange.from, activeRange.to],
    queryFn: () => fetchSalesReport(activeRange.from, activeRange.to),
    enabled: canViewReports,
  });
  const dailySales = data?.dailySales ?? [];
  const payments = data?.payments ?? [];
  const topProducts = data?.topProducts ?? [];
  const completedSales = numberValue(fieldValue(data, ["completedSales", "salesCount"]));
  const voidedSales = numberValue(fieldValue(data, ["voidedSales", "cancelledSales"]));
  const grossRevenue = fieldValue(data, ["grossRevenue", "revenue", "totalRevenue", "salesTotal"]);
  const averageTicket = fieldValue(data, ["averageTicket", "avgTicket"]);

  if (!canViewReports) {
    return <PermissionDenied title="Reporte de ventas" message="No tienes permiso para consultar reportes." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporte de ventas"
        description={data ? `${dateLabel(data.from)} - ${dateLabel(data.to)}` : undefined}
      />

      <div className="space-y-4">
        <div role="tablist" className="flex gap-1 border-b border-border">
          {[
            { value: "weekly" as const, label: "Reporte semanal" },
            { value: "custom" as const, label: "Rango personalizado" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                activeTab === tab.value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "weekly" ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Semana actual automatica</p>
              <p className="text-sm text-muted-foreground">
                {dateLabel(defaultDates.from)} - {dateLabel(defaultDates.to)}
              </p>
            </div>
            <Button onClick={() => refetch()} disabled={isFetching}>
              <BarChart3 className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="report-from">Desde</Label>
              <Input id="report-from" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-to">Hasta</Label>
              <Input id="report-to" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
            </div>
            <Button
              onClick={() => setCustomRange({ from: customFrom, to: customTo })}
              disabled={isFetching || !customFrom || !customTo}
            >
              <BarChart3 className="h-4 w-4" />
              Generar reporte
            </Button>
          </div>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando reporte...</p>}
      {isError && <p className="text-sm text-destructive">No se pudo cargar el reporte de ventas.</p>}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Ingresos" value={moneyOrZero(grossRevenue)} icon={DollarSign} tone="primary" />
            <MetricCard label="Ventas completadas" value={String(completedSales)} icon={Receipt} tone="success" />
            <MetricCard label="Ticket promedio" value={moneyOrZero(averageTicket)} icon={Ticket} tone="info" />
            <MetricCard label="Anuladas" value={String(voidedSales)} icon={XCircle} tone="danger" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ventas por dia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2">Fecha</th>
                        <th className="py-2 text-right">Ventas</th>
                        <th className="py-2 text-right">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySales.map((day) => (
                        <tr key={day.date} className="border-b last:border-b-0">
                          <td className="py-2">{dateLabel(day.date)}</td>
                          <td className="py-2 text-right">{numberValue(fieldValue(day, ["salesCount", "count"]))}</td>
                          <td className="py-2 text-right font-mono-money">{moneyOrZero(fieldValue(day, ["revenue", "amount", "total"]))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metodos de pago</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <EmptyState message="No hay pagos en este rango." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2">Metodo</th>
                          <th className="py-2 text-right">Pagos</th>
                          <th className="py-2 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => (
                          <tr key={payment.method} className="border-b last:border-b-0">
                            <td className="py-2">
                              <PaymentMethodBadge method={payment.method} />
                            </td>
                            <td className="py-2 text-right">{numberValue(fieldValue(payment, ["paymentsCount", "count"]))}</td>
                            <td className="py-2 text-right font-mono-money">{moneyOrZero(fieldValue(payment, ["amount", "total"]))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Productos mas vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <EmptyState message="No hay productos vendidos en este rango." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2">Producto</th>
                        <th className="py-2 text-right">Unidades</th>
                        <th className="py-2 text-right">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((product) => (
                        <tr key={product.productId} className="border-b last:border-b-0">
                          <td className="py-2">{product.productName}</td>
                          <td className="py-2 text-right">{numberValue(fieldValue(product, ["quantity", "count"]))}</td>
                          <td className="py-2 text-right font-mono-money">{moneyOrZero(fieldValue(product, ["revenue", "amount", "total"]))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
