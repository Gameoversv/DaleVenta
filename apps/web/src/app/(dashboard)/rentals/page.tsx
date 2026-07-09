"use client";

import { CalendarClock, ClipboardCheck, PackageCheck, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RentalContractResponse, RentalContractStatus } from "@/types/rental";

const WORKFLOW = [
  {
    title: "Reservas",
    description: "Separar articulos por cliente, fecha de entrega y fecha esperada de devolucion.",
    icon: CalendarClock,
  },
  {
    title: "Entrega",
    description: "Registrar salida, deposito, anticipo, contrato y estado inicial de los articulos.",
    icon: PackageCheck,
  },
  {
    title: "Devolucion",
    description: "Recibir articulos, calcular atrasos, danos, faltantes y devolucion de deposito.",
    icon: RotateCcw,
  },
  {
    title: "Reporte",
    description: "Ver alquileres activos, vencidos, ingresos, depositos y articulos mas rentados.",
    icon: ClipboardCheck,
  },
];

async function fetchRentals(): Promise<RentalContractResponse[]> {
  const res = await api.get<{ data: RentalContractResponse[] }>("/api/rentals");
  return res.data.data;
}

function money(value: string): string {
  return `RD$${Number(value).toFixed(2)}`;
}

function dateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function statusVariant(status: RentalContractStatus): "success" | "secondary" | "danger" {
  if (status === "ACTIVE") return "success";
  if (status === "CANCELLED") return "danger";
  return "secondary";
}

export default function RentalsPage() {
  const tenantFeatures = useTenantFeatures();
  const canView = usePermission("SALE_VIEW_HISTORY") || usePermission("SALE_CREATE");
  const { data: rentals, isLoading, isError } = useQuery({
    queryKey: ["rentals"],
    queryFn: fetchRentals,
    enabled: tenantFeatures.rentalModuleEnabled && canView,
  });

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
          Reservas, entregas, devoluciones, depositos y cargos por atraso o dano.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {WORKFLOW.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contratos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando alquileres...</p>}
          {isError && <p className="text-sm text-destructive">No se pudieron cargar los alquileres.</p>}
          {!isLoading && (rentals ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No hay contratos de alquiler todavia.</p>
          )}
          {(rentals ?? []).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2">Contrato</th>
                    <th className="py-2">Cliente</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2">Devolucion</th>
                    <th className="py-2 text-right">Deposito</th>
                    <th className="py-2">Articulos</th>
                  </tr>
                </thead>
                <tbody>
                  {(rentals ?? []).map((rental) => (
                    <tr key={rental.id} className="border-b border-border">
                      <td className="py-2 font-medium">{rental.contractNumber}</td>
                      <td className="py-2">{rental.customerName}</td>
                      <td className="py-2">
                        <Badge variant={statusVariant(rental.status)}>{rental.status}</Badge>
                      </td>
                      <td className="py-2">{dateTime(rental.expectedReturnAt)}</td>
                      <td className="py-2 text-right font-mono-money">{money(rental.depositAmount)}</td>
                      <td className="py-2 text-muted-foreground">
                        {rental.items.map((item) => `${item.productName} x ${item.quantity}`).join(", ")}
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
