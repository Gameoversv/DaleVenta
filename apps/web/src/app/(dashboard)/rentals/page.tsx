"use client";

import { CalendarClock, ClipboardCheck, PackageCheck, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/hooks/usePermission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function RentalsPage() {
  const { tenantFeatures } = useAuth();
  const canView = usePermission("SALE_VIEW_HISTORY") || usePermission("SALE_CREATE");

  if (!tenantFeatures.rentalModuleEnabled) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Alquileres</h1>
        <p className="text-sm text-muted-foreground">Este modulo no esta activo para este tenant.</p>
      </div>
    );
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
          <CardTitle>Modulo activado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>La activacion por tenant ya esta lista.</p>
          <p>El siguiente paso es crear contratos de alquiler, disponibilidad, depositos y devoluciones.</p>
        </CardContent>
      </Card>
    </div>
  );
}
