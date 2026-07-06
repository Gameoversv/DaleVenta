"use client";

import { useState } from "react";
import { CategoryPanel } from "@/components/products/CategoryPanel";
import { ProductTable } from "@/components/products/ProductTable";
import { usePermission } from "@/hooks/usePermission";

export default function ProductsPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const canViewInventory = usePermission("INVENTORY_VIEW");

  if (!canViewInventory) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <p className="text-sm text-muted-foreground">No tienes permiso para ver productos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Productos</h1>
      <div className="grid grid-cols-[240px_1fr] gap-6">
        <CategoryPanel selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} />
        <ProductTable categoryId={selectedCategoryId} />
      </div>
    </div>
  );
}
