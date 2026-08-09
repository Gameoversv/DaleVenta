"use client";

import Link from "next/link";
import { usePermission } from "@/hooks/usePermission";
import { useOperationalLocation } from "@/hooks/useOperationalLocation";
import { Button } from "@/components/ui/button";
import { CashShiftWorkspace } from "@/components/cash-shift/CashShiftWorkspace";
import { PageHeader } from "@/components/common/page-header";
import { OperationalLocationSelector } from "@/components/common/OperationalLocationSelector";
import { PermissionDenied } from "@/components/common/permission-denied";

export default function CashShiftPage() {
  const canOpenCashShift = usePermission("CASHSHIFT_OPEN");
  const canManageSettings = usePermission("SETTINGS_MANAGE");
  const location = useOperationalLocation({ enabled: canOpenCashShift });

  if (!canOpenCashShift) {
    return (
      <PermissionDenied title="Turno de Caja" message="Tu usuario no tiene permiso para operar turnos de caja." />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Turno de Caja" />
      <OperationalLocationSelector
        location={location}
        idPrefix="cash-shift"
        emptyBranchAction={
          canManageSettings ? (
            <Button asChild size="sm">
              <Link href="/branches">Administrar sucursales</Link>
            </Button>
          ) : undefined
        }
        emptyRegisterAction={
          canManageSettings ? (
            <Button asChild size="sm" variant="secondary">
              <Link href="/branches">Administrar cajas</Link>
            </Button>
          ) : undefined
        }
      />
      {location.registerId && (
        <CashShiftWorkspace key={location.registerId} registerId={location.registerId} branchId={location.branchId} />
      )}
    </div>
  );
}
