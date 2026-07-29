"use client";

import { useState } from "react";
import { CategoryPanel } from "@/components/products/CategoryPanel";
import { ProductTable } from "@/components/products/ProductTable";
import { usePermission } from "@/hooks/usePermission";
import { PageHeader } from "@/components/common/page-header";
import { PermissionDenied } from "@/components/common/permission-denied";

export default function ProductsPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const canViewInventory = usePermission("INVENTORY_VIEW");

  if (!canViewInventory) {
    return <PermissionDenied title="Productos" message="No tienes permiso para ver productos." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Productos" />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <CategoryPanel selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} />
        <ProductTable categoryId={selectedCategoryId} />
      </div>
    </div>
  );
}
