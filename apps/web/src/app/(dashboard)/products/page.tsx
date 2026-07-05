"use client";

import { useState } from "react";
import { CategoryPanel } from "@/components/products/CategoryPanel";

export default function ProductsPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Productos</h1>
      <div className="grid grid-cols-[240px_1fr] gap-6">
        <CategoryPanel selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} />
        <div className="text-muted-foreground">Selecciona una categoria o crea un producto.</div>
      </div>
    </div>
  );
}
