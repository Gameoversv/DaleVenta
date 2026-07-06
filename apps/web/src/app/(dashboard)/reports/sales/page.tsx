"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentMethod } from "@/types/sale";
import type { SalesReportResponse } from "@/types/report";

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

function paymentLabel(method: PaymentMethod): string {
  if (method === "CASH") return "Efectivo";
  if (method === "TRANSFER") return "Transferencia";
  return "Credito";
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
          <h1 className="text-2xl font-semibold">Reporte de ventas</h1>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{money(data.grossRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Ventas completadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{data.completedSales}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Ticket promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{money(data.averageTicket)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Anuladas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{data.voidedSales}</p>
              </CardContent>
            </Card>
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
                          <td className="py-2 text-right">{money(day.revenue)}</td>
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
                            <td className="py-2">{paymentLabel(payment.method)}</td>
                            <td className="py-2 text-right">{payment.paymentsCount}</td>
                            <td className="py-2 text-right">{money(payment.amount)}</td>
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
                          <td className="py-2 text-right">{money(product.revenue)}</td>
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
