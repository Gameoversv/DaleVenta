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
import { cn } from "@/lib/utils";
import type { SalesReportResponse } from "@/types/report";

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

function money(value: string | number): string {
  return `RD$${Number(value).toFixed(2)}`;
}

function dateLabel(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

export default function SalesReportPage() {
  const canViewReports = usePermission("REPORTS_VIEW");
  const defaultDates = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 6);
    return { from: isoDate(from), to: isoDate(to) };
  }, []);
  const [from, setFrom] = useState(defaultDates.from);
  const [to, setTo] = useState(defaultDates.to);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["sales-report", from, to],
    queryFn: () => fetchSalesReport(from, to),
    enabled: canViewReports,
  });
  const dailySales = data?.dailySales ?? [];
  const payments = data?.payments ?? [];
  const topProducts = data?.topProducts ?? [];

  if (!canViewReports) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Reporte de ventas</h1>
        <p className="text-muted-foreground">No tienes permiso para consultar reportes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Reporte de ventas</h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              {dateLabel(data.from)} - {dateLabel(data.to)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="report-from">Desde</Label>
            <Input id="report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-to">Hasta</Label>
            <Input id="report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <Button onClick={() => refetch()} disabled={isFetching || !from || !to}>
            <BarChart3 className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando reporte...</p>}
      {isError && <p className="text-sm text-destructive">No se pudo cargar el reporte de ventas.</p>}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Ingresos" value={money(data.grossRevenue)} icon={DollarSign} tone="primary" />
            <MetricCard label="Ventas completadas" value={String(data.completedSales)} icon={Receipt} tone="success" />
            <MetricCard label="Ticket promedio" value={money(data.averageTicket)} icon={Ticket} tone="info" />
            <MetricCard label="Anuladas" value={String(data.voidedSales)} icon={XCircle} tone="danger" />
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
                          <td className="py-2 text-right">{day.salesCount}</td>
                          <td className="py-2 text-right font-mono-money">{money(day.revenue)}</td>
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
                  <p className="text-sm text-muted-foreground">No hay pagos en este rango.</p>
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
                            <td className="py-2 text-right">{payment.paymentsCount}</td>
                            <td className="py-2 text-right font-mono-money">{money(payment.amount)}</td>
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
                <p className="text-sm text-muted-foreground">No hay productos vendidos en este rango.</p>
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
                          <td className="py-2 text-right">{product.quantity}</td>
                          <td className="py-2 text-right font-mono-money">{money(product.revenue)}</td>
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
