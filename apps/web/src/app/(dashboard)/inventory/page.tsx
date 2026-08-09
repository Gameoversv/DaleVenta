"use client";

import { InventoryTable } from "@/components/inventory/InventoryTable";
import { usePermission } from "@/hooks/usePermission";
import { useOperationalLocation } from "@/hooks/useOperationalLocation";
import { PageHeader } from "@/components/common/page-header";
import { OperationalLocationSelector } from "@/components/common/OperationalLocationSelector";
import { PermissionDenied } from "@/components/common/permission-denied";

export default function InventoryPage() {
  const canViewInventory = usePermission("INVENTORY_VIEW");
  const location = useOperationalLocation({ enabled: canViewInventory, requireRegister: false });

  if (!canViewInventory) {
    return <PermissionDenied title="Inventario" message="No tienes permiso para ver inventario." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inventario" />
      <OperationalLocationSelector location={location} requireRegister={false} idPrefix="inventory" />
      {location.branchId && <InventoryTable branchId={location.branchId} />}
    </div>
  );
}
