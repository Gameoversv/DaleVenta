"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileText, PackageCheck, WalletCards } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { usePermission, useAnyPermission } from "@/hooks/usePermission";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RentalContractResponse, RentalContractStatus } from "@/types/rental";
import { money } from "@/lib/money";
import { dateTime } from "@/lib/dates";

type ViewTab = "contracts" | "deposits";
type ContractFilter = "all" | "overdue" | "rented" | "reserved" | "received";

const FILTERS: Array<{ value: ContractFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "overdue", label: "Vencidos" },
  { value: "rented", label: "Alquilados" },
  { value: "reserved", label: "Reservados" },
  { value: "received", label: "Recibidos" },
];

async function fetchRentals(): Promise<RentalContractResponse[]> {
  const res = await api.get<{ data: RentalContractResponse[] }>("/api/rentals");
  return res.data.data;
}

async function markRentalReturned(id: string): Promise<RentalContractResponse> {
  const res = await api.patch<{ data: RentalContractResponse }>(`/api/rentals/${id}/return`);
  return res.data.data;
}



function isOpenRental(rental: RentalContractResponse): boolean {
  return rental.status === "ACTIVE" || rental.status === "RESERVED";
}

function isOverdue(rental: RentalContractResponse): boolean {
  return isOpenRental(rental) && new Date(rental.expectedReturnAt).getTime() < Date.now();
}

function statusLabel(status: RentalContractStatus): string {
  if (status === "RESERVED") return "Reservado";
  if (status === "ACTIVE") return "Alquilado";
  if (status === "RETURNED") return "Recibido";
  return "Anulado";
}

function statusVariant(status: RentalContractStatus): "success" | "secondary" | "danger" | "warning" | "info" {
  if (status === "ACTIVE") return "info";
  if (status === "RESERVED") return "warning";
  if (status === "RETURNED") return "success";
  return "danger";
}

export default function RentalsPage() {
  const tenantFeatures = useTenantFeatures();
  const canView = useAnyPermission("SALE_VIEW_HISTORY", "SALE_CREATE");
  const canReceive = usePermission("SALE_CREATE");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ViewTab>("contracts");
  const [filter, setFilter] = useState<ContractFilter>("all");

  const { data: rentals = [], isLoading, isError } = useQuery({
    queryKey: ["rentals"],
    queryFn: fetchRentals,
    enabled: tenantFeatures.rentalModuleEnabled && canView,
  });

  const returnMutation = useMutation({
    mutationFn: markRentalReturned,
    onSuccess: () => {
      toast.success("Alquiler marcado como recibido");
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo recibir el alquiler";
      toast.error(message);
    },
  });

  const filteredRentals = useMemo(() => {
    return rentals.filter((rental) => {
      if (filter === "overdue") return isOverdue(rental);
      if (filter === "rented") return rental.status === "ACTIVE";
      if (filter === "reserved") return rental.status === "RESERVED";
      if (filter === "received") return rental.status === "RETURNED";
      return true;
    });
  }, [filter, rentals]);

  const metrics = useMemo(() => {
    const open = rentals.filter(isOpenRental);
    return {
      rented: rentals.filter((rental) => rental.status === "ACTIVE").length,
      reserved: rentals.filter((rental) => rental.status === "RESERVED").length,
      received: rentals.filter((rental) => rental.status === "RETURNED").length,
      overdue: rentals.filter(isOverdue).length,
      deposits: open.reduce((sum, rental) => sum + Number(rental.depositAmount), 0),
    };
  }, [rentals]);

  const depositsByItem = useMemo(() => {
    const rows = new Map<string, { productName: string; quantity: number; contracts: number; deposit: number }>();
    rentals.filter(isOpenRental).forEach((rental) => {
      const totalQuantity = rental.items.reduce((sum, item) => sum + item.quantity, 0) || 1;
      rental.items.forEach((item) => {
        const current = rows.get(item.productId) ?? {
          productName: item.productName,
          quantity: 0,
          contracts: 0,
          deposit: 0,
        };
        current.quantity += item.quantity;
        current.contracts += 1;
        current.deposit += (Number(rental.depositAmount) * item.quantity) / totalQuantity;
        rows.set(item.productId, current);
      });
    });
    return Array.from(rows.values()).sort((a, b) => b.deposit - a.deposit);
  }, [rentals]);

  if (!tenantFeatures.rentalModuleEnabled) {
    return null;
  }

  if (!canView) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Alquileres</h1>
        <p className="text-sm text-muted-foreground">Tu usuario no tiene permiso para consultar alquileres.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Alquileres</h1>
        <p className="text-sm text-muted-foreground">
          Contratos, devoluciones, vencimientos y depositos activos por articulo.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Alquilados</p>
              <p className="font-mono-money text-2xl font-bold">{metrics.rented}</p>
            </div>
            <PackageCheck className="h-5 w-5 text-info" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Vencidos</p>
              <p className="font-mono-money text-2xl font-bold">{metrics.overdue}</p>
            </div>
            <Clock3 className="h-5 w-5 text-destructive" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Recibidos</p>
              <p className="font-mono-money text-2xl font-bold">{metrics.received}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Depositos activos</p>
              <p className="font-mono-money text-2xl font-bold">{money(metrics.deposits)}</p>
            </div>
            <WalletCards className="h-5 w-5 text-credit" />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {[
          { value: "contracts" as const, label: "Contratos" },
          { value: "deposits" as const, label: "Depositos" },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === item.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "contracts" ? (
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle>Contratos</CardTitle>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      filter === item.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-sm text-muted-foreground">Cargando alquileres...</p>}
            {isError && <p className="text-sm text-destructive">No se pudieron cargar los alquileres.</p>}
            {!isLoading && filteredRentals.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay contratos para este filtro.</p>
            )}
            {filteredRentals.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-4 py-3">Contrato</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Devolucion</th>
                      <th className="px-4 py-3 text-right">Deposito</th>
                      <th className="px-4 py-3">Articulos</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRentals.map((rental) => (
                      <tr key={rental.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">
                          <Link className="text-primary hover:underline" href={`/sales/${rental.saleId}/invoice`}>
                            {rental.contractNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{rental.customerName}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={statusVariant(rental.status)}>{statusLabel(rental.status)}</Badge>
                            {isOverdue(rental) && <Badge variant="danger">Vencido</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{dateTime(rental.expectedReturnAt)}</td>
                        <td className="px-4 py-3 text-right font-mono-money font-semibold">{money(rental.depositAmount)}</td>
                        <td className="max-w-[22rem] px-4 py-3 text-muted-foreground">
                          {rental.items.map((item) => `${item.productName} x ${item.quantity}`).join(", ")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/sales/${rental.saleId}/invoice`}>
                                <FileText className="h-4 w-4" />
                                Factura
                              </Link>
                            </Button>
                            {isOpenRental(rental) && canReceive && (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={returnMutation.isPending}
                                onClick={() => returnMutation.mutate(rental.id)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Recibir
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Depositos por articulo</CardTitle>
          </CardHeader>
          <CardContent>
            {depositsByItem.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay depositos activos registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-4 py-3">Articulo</th>
                      <th className="px-4 py-3 text-right">Cantidad alquilada</th>
                      <th className="px-4 py-3 text-right">Contratos</th>
                      <th className="px-4 py-3 text-right">Deposito asociado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depositsByItem.map((item) => (
                      <tr key={item.productName} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">{item.productName}</td>
                        <td className="px-4 py-3 text-right font-mono-money">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono-money">{item.contracts}</td>
                        <td className="px-4 py-3 text-right font-mono-money font-semibold">{money(item.deposit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
