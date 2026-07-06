"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign } from "lucide-react";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Card, CardContent } from "@/components/ui/card";
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
        <h1 className="font-display text-2xl font-bold">Cuentas por cobrar</h1>
        <p className="text-muted-foreground">No tienes permiso para ver reportes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-tight">Cuentas por cobrar</h1>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-credit/10 text-credit">
            <CircleDollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="font-mono-money text-3xl font-extrabold text-credit">{money(totalOutstanding.toFixed(2))}</p>
            <p className="text-sm text-muted-foreground">
              {rows?.length ?? 0} cliente{rows?.length === 1 ? "" : "s"} con balance pendiente
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Cargando...</p>}
          {isError && <p className="p-6 text-sm text-destructive">No se pudo cargar la lista.</p>}
          {rows && rows.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">Ningun cliente tiene balance pendiente.</p>
          )}
          {rows && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Telefono</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-right">Limite</th>
                    <th className="px-4 py-3 text-right">Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.customerId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{row.customerName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.phone ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-mono-money font-semibold text-warning">{money(row.balance)}</td>
                      <td className="px-4 py-3 text-right font-mono-money text-muted-foreground">
                        {row.creditLimit != null ? money(row.creditLimit) : "Sin limite"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono-money">
                        {row.creditLimit != null ? money((Number(row.creditLimit) - Number(row.balance)).toFixed(2)) : "-"}
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
