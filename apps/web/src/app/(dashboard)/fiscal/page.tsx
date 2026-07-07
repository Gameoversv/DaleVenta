"use client";

import { useQuery } from "@tanstack/react-query";
import { Landmark } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TenantFeatures } from "@/types/auth";

async function fetchFiscalStatus(): Promise<TenantFeatures> {
  const res = await api.get<{ data: TenantFeatures }>("/api/fiscal/status");
  return res.data.data;
}

export default function FiscalPage() {
  const { tenantFeatures, user } = useAuth();
  const { data: fiscalStatus, isLoading } = useQuery({
    queryKey: ["fiscal-status"],
    queryFn: fetchFiscalStatus,
    enabled: user?.role === "ADMIN",
  });

  const fiscalModuleEnabled = fiscalStatus?.fiscalModuleEnabled ?? tenantFeatures.fiscalModuleEnabled;

  if (user?.role !== "ADMIN") {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Fiscal</h1>
        <p className="text-sm text-muted-foreground">Solo un administrador puede acceder al modulo fiscal.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Fiscal</h1>
        <p className="text-sm text-muted-foreground">Confirmando estado del modulo fiscal...</p>
      </div>
    );
  }

  if (!fiscalModuleEnabled) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Fiscal</h1>
        <p className="text-sm text-muted-foreground">Este modulo no esta activo para este tenant.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Fiscal</h1>
        <p className="text-sm text-muted-foreground">RNC, comprobantes fiscales, secuencias NCF y factura fiscal.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Modulo fiscal activo
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          La activacion por tenant ya esta lista. El siguiente paso es configurar datos fiscales, tipos de comprobante,
          secuencias NCF y vencimientos.
        </CardContent>
      </Card>
    </div>
  );
}
