"use client";

import { Landmark } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/hooks/usePermission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FiscalPage() {
  const { tenantFeatures } = useAuth();
  const canManageSettings = usePermission("SETTINGS_MANAGE");

  if (!tenantFeatures.fiscalModuleEnabled) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Fiscal</h1>
        <p className="text-sm text-muted-foreground">Este modulo no esta activo para este tenant.</p>
      </div>
    );
  }

  if (!canManageSettings) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Fiscal</h1>
        <p className="text-sm text-muted-foreground">No tienes permiso para administrar configuracion fiscal.</p>
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
