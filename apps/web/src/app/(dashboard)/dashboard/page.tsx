"use client";

import Link from "next/link";
import { Boxes, CircleDollarSign, ShoppingCart, Users, Wallet, AlertTriangle, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummaryResponse } from "@/types/dashboard";
import { money } from "@/lib/money";

async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  const res = await api.get<{ data: DashboardSummaryResponse }>("/api/dashboard/summary");
  return res.data.data;
}


interface MetricCardProps {
  title: string;
  value: string;
  detail: string;
  href: string;
  icon: typeof ShoppingCart;
  tone?: "primary" | "success" | "warning" | "info" | "credit";
}

const TONE_STYLES: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  credit: "bg-credit/10 text-credit",
};

function MetricCard({ title, value, detail, href, icon: Icon, tone = "primary" }: MetricCardProps) {
  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
        <CardContent className="flex items-start justify-between gap-3 p-5">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="font-mono-money font-display text-2xl font-bold tracking-tight">{value}</p>
            <p className="truncate text-xs text-muted-foreground">{detail}</p>
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TONE_STYLES[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono-money text-sm font-semibold">{value}</span>
    </div>
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
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">No tienes permiso para ver el dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Hola, {user?.name?.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Este es el resumen de tu negocio hoy.</p>
        </div>
        <div className="hidden items-center gap-1.5 rounded-lg border border-success/25 bg-success/10 px-3 py-1.5 text-xs font-medium text-success sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Sistema operativo
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando resumen...</p>}
      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudo cargar el resumen del negocio. Intenta de nuevo en unos segundos.
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Ventas de hoy"
              value={data.salesToday.toString()}
              detail={`${money(data.revenueToday)} facturados`}
              href="/pos"
              icon={ShoppingCart}
              tone="primary"
            />
            <MetricCard
              title="Cajas abiertas"
              value={data.openCashShifts.toString()}
              detail="Turnos actualmente en operacion"
              href="/cash-shift"
              icon={Wallet}
              tone="success"
            />
            <MetricCard
              title="Stock bajo"
              value={data.lowStockItems.toString()}
              detail="Productos por debajo del minimo"
              href="/inventory"
              icon={AlertTriangle}
              tone="warning"
            />
            <MetricCard
              title="Clientes activos"
              value={data.activeCustomers.toString()}
              detail="Disponibles para venta y credito"
              href="/customers"
              icon={Users}
              tone="info"
            />
            <MetricCard
              title="Cuentas por cobrar"
              value={money(data.accountsReceivable)}
              detail="Balance pendiente de clientes"
              href="/reports/accounts-receivable"
              icon={CircleDollarSign}
              tone="credit"
            />
            <MetricCard
              title="Inventario"
              value="Ver detalle"
              detail="Existencias por sucursal"
              href="/inventory"
              icon={Boxes}
              tone="primary"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <TrendingUp className="h-4 w-4 text-primary" />
                <CardTitle>Operacion de hoy</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <DetailRow label="Ingresos registrados" value={money(data.revenueToday)} />
                <DetailRow label="Ventas completadas" value={data.salesToday.toString()} />
                <DetailRow label="Turnos abiertos" value={data.openCashShifts.toString()} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <CardTitle>Atencion requerida</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <DetailRow label="Productos con stock bajo" value={data.lowStockItems.toString()} />
                <DetailRow label="Balance pendiente" value={money(data.accountsReceivable)} />
                <DetailRow label="Clientes activos" value={data.activeCustomers.toString()} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
