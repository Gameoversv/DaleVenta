"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign } from "lucide-react";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { Card, CardContent } from "@/components/ui/card";
import type { AccountsPayableRow } from "@/types/purchase";

async function fetchPayables(): Promise<AccountsPayableRow[]> {
  const res = await api.get<{ data: AccountsPayableRow[] }>("/api/purchases/accounts-payable");
  return res.data.data;
}

function money(value: string | number): string {
  return `RD$${Number(value).toFixed(2)}`;
}

function dateOnly(value: string): string {
  return new Date(value).toLocaleDateString();
}

export default function AccountsPayablePage() {
  const canView = usePermission("PURCHASE_PAYABLE_VIEW");
  const tenantFeatures = useTenantFeatures();
  const enabled = tenantFeatures.purchaseModuleEnabled;
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["accounts-payable"],
    queryFn: fetchPayables,
    enabled: enabled && canView,
  });

  const totalOutstanding = useMemo(
    () => (rows ?? []).reduce((sum, row) => sum + Number(row.balanceDue), 0),
    [rows]
  );

  if (!enabled) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Cuentas por pagar</h1>
        <p className="text-muted-foreground">Este modulo no esta activo para este tenant.</p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Cuentas por pagar</h1>
        <p className="text-muted-foreground">No tienes permiso para ver cuentas por pagar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-tight">Cuentas por pagar</h1>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <CircleDollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="font-mono-money text-3xl font-extrabold text-warning">{money(totalOutstanding)}</p>
            <p className="text-sm text-muted-foreground">
              {rows?.length ?? 0} compra{rows?.length === 1 ? "" : "s"} con balance pendiente
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Cargando...</p>}
          {isError && <p className="p-6 text-sm text-destructive">No se pudo cargar la lista.</p>}
          {rows && rows.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No hay compras con balance pendiente.</p>
          )}
          {rows && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3">Compra</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Factura proveedor</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Pagado</th>
                    <th className="px-4 py-3 text-right">Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.purchaseId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{row.purchaseNumber}</td>
                      <td className="px-4 py-3">{row.supplierName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{dateOnly(row.purchasedAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.invoiceNumber ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-mono-money">{money(row.total)}</td>
                      <td className="px-4 py-3 text-right font-mono-money text-muted-foreground">{money(row.paidAmount)}</td>
                      <td className="px-4 py-3 text-right font-mono-money font-semibold text-warning">{money(row.balanceDue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
