"use client";

import { useState } from "react";
import { CategoryPanel } from "@/components/products/CategoryPanel";
import { ProductTable } from "@/components/products/ProductTable";

export default function ProductsPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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
