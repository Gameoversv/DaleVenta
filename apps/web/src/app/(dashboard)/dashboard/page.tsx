"use client";

import Link from "next/link";
import { Boxes, CircleDollarSign, ShoppingCart, Users, Wallet, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/hooks/usePermission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummaryResponse } from "@/types/dashboard";

async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  const res = await api.get<{ data: DashboardSummaryResponse }>("/api/dashboard/summary");
  return res.data.data;
}

function formatMoney(value: string): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(value));
}

interface MetricCardProps {
  title: string;
  value: string;
  detail: string;
  href: string;
  icon: typeof ShoppingCart;
}

function MetricCard({ title, value, detail, href, icon: Icon }: MetricCardProps) {
  return (
    <Link href={href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-colors hover:bg-accent/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const canView = usePermission("DASHBOARD_VIEW");
  const { data, isError, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchDashboardSummary,
    enabled: canView,
  });

  if (!canView) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">No tienes permiso para ver el dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Bienvenido, {user?.name}</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando resumen...</p>}
      {isError && <p className="text-sm text-destructive">No se pudo cargar el resumen del negocio.</p>}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Ventas de hoy"
              value={data.salesToday.toString()}
              detail={`${formatMoney(data.revenueToday)} facturados`}
              href="/pos"
              icon={ShoppingCart}
            />
            <MetricCard
              title="Cajas abiertas"
              value={data.openCashShifts.toString()}
              detail="Turnos actualmente en operacion"
              href="/cash-shift"
              icon={Wallet}
            />
            <MetricCard
              title="Stock bajo"
              value={data.lowStockItems.toString()}
              detail="Productos por debajo del minimo"
              href="/inventory"
              icon={AlertTriangle}
            />
            <MetricCard
              title="Clientes activos"
              value={data.activeCustomers.toString()}
              detail="Clientes disponibles para venta y credito"
              href="/customers"
              icon={Users}
            />
            <MetricCard
              title="Cuentas por cobrar"
              value={formatMoney(data.accountsReceivable)}
              detail="Balance pendiente de clientes"
              href="/customers"
              icon={CircleDollarSign}
            />
            <MetricCard
              title="Inventario"
              value="Ver"
              detail="Consulta existencias por sucursal"
              href="/inventory"
              icon={Boxes}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Operacion de hoy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Ingresos registrados</span>
                  <span className="font-medium">{formatMoney(data.revenueToday)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Ventas completadas</span>
                  <span className="font-medium">{data.salesToday}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Turnos abiertos</span>
                  <span className="font-medium">{data.openCashShifts}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Atencion requerida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Productos con stock bajo</span>
                  <span className="font-medium">{data.lowStockItems}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Balance pendiente</span>
                  <span className="font-medium">{formatMoney(data.accountsReceivable)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Clientes activos</span>
                  <span className="font-medium">{data.activeCustomers}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
