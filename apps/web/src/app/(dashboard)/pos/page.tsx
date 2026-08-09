"use client";

import { PosWorkspace } from "@/components/pos/PosWorkspace";
import { usePermission } from "@/hooks/usePermission";
import { useOperationalLocation } from "@/hooks/useOperationalLocation";
import { PageHeader } from "@/components/common/page-header";
import { OperationalLocationSelector } from "@/components/common/OperationalLocationSelector";
import { PermissionDenied } from "@/components/common/permission-denied";

export default function PosPage() {
  const canCreateSale = usePermission("SALE_CREATE");
  const location = useOperationalLocation({ enabled: canCreateSale });

  if (!canCreateSale) {
    return <PermissionDenied title="POS" message="No tienes permiso para crear ventas." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="POS" />
      <OperationalLocationSelector location={location} idPrefix="pos" />
      {location.registerId && <PosWorkspace registerId={location.registerId} />}
    </div>
  );
}
