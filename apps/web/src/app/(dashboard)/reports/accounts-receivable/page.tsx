"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccountsReceivableRow } from "@/types/credit";

async function fetchReceivables(): Promise<AccountsReceivableRow[]> {
  const res = await api.get<{ data: AccountsReceivableRow[] }>("/api/credit/accounts-receivable");
  return res.data.data;
}

function money(value: string): string {
  return `RD$${Number(value).toFixed(2)}`;
}

export default function AccountsReceivablePage() {
  const canView = usePermission("REPORTS_VIEW");
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["accounts-receivable"],
    queryFn: fetchReceivables,
    enabled: canView,
  });

  const totalOutstanding = useMemo(
    () => (rows ?? []).reduce((sum, row) => sum + Number(row.balance), 0),
    [rows]
  );

  if (!canView) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Cuentas por cobrar</h1>
        <p className="text-muted-foreground">No tienes permiso para ver reportes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cuentas por cobrar</h1>

      <Card>
        <CardHeader>
          <CardTitle>Total pendiente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{money(totalOutstanding.toFixed(2))}</p>
          <p className="text-sm text-muted-foreground">
            {rows?.length ?? 0} cliente{rows?.length === 1 ? "" : "s"} con balance pendiente
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clientes con credito pendiente</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
          {isError && <p className="text-sm text-destructive">No se pudo cargar la lista.</p>}
          {rows && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">Ningun cliente tiene balance pendiente.</p>
          )}
          {rows && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2">Cliente</th>
                    <th className="py-2">Telefono</th>
                    <th className="py-2 text-right">Balance</th>
                    <th className="py-2 text-right">Limite</th>
                    <th className="py-2 text-right">Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.customerId} className="border-b border-border">
                      <td className="py-2 font-medium">{row.customerName}</td>
                      <td className="py-2">{row.phone ?? "—"}</td>
                      <td className="py-2 text-right text-destructive">{money(row.balance)}</td>
                      <td className="py-2 text-right">{money(row.creditLimit)}</td>
                      <td className="py-2 text-right">
                        {money((Number(row.creditLimit) - Number(row.balance)).toFixed(2))}
                      </td>
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
