# Products/Categories/Inventory (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Note for this run:** executed inline in the current session by the controller directly (no subagent dispatch), per standing user instruction. TDD discipline and per-task verification still apply exactly as written below.

**Goal:** Build `/products` (categories + product catalog) and `/inventory` (branch stock view + manual adjustments) screens against the already-shipped backend Product/BranchInventory APIs — no backend changes in this module.

**Architecture:** Two pages, each following the established dialog-based CRUD pattern from Branches/Registers (`Dialog` primitive, react-hook-form + zod, TanStack Query invalidation). Category creation is inline (single field, no modal needed). Product create/edit and stock adjustment use modals.

**Tech Stack:** Next.js 16/React 19/TypeScript, TanStack Query, react-hook-form + zod, existing `Dialog`/`Button`/`Input`/`Label`/`Card` primitives (Frontend Foundation, Branches/Registers), Playwright.

## Global Constraints

- No backend changes — this module only builds against `GET/POST /api/categories`, `GET/POST/PUT /api/products`, `GET /api/inventory/branch/{id}`, `GET /api/inventory/low-stock`, `POST /api/inventory/movements`, all already shipped.
- `ProductResponse.cost`/`salePrice`/`wholesalePrice` come back `null` when the user lacks `COST_VIEW`/`PRICE_VIEW` — render `"—"` for `null`, never treat it as `0` or hide the column entirely (a `0` would be a real, meaningful price).
- No min/max stock editing, no product/category deactivation, no movement history list — none of these have backend endpoints (explicit scope decision in the design spec, §2).
- `internalCode`/`barcode` are create-only fields (absent from `UpdateProductRequest`) — the edit modal must not show them.
- Frontend error handling: `toast.error(err.response?.data?.error ?? 'mensaje generico')` in every mutation's `onError`, matching the established pattern.
- Gating: `usePermission('INVENTORY_VIEW')` on both nav items; `INVENTORY_CREATE` on create buttons; `INVENTORY_EDIT` on the product edit button; `INVENTORY_ADJUST` on the stock adjustment button.
- TanStack Query keys: `['categories']`, `['products']`, `['branches']` (shared with `/branches`), `['inventory', branchId]`.

---

### Task 1: Types + Category panel (inline create) on `/products`

**Files:**
- Create: `apps/web/src/types/product.ts`
- Create: `apps/web/src/components/products/CategoryPanel.tsx`
- Create: `apps/web/src/app/(dashboard)/products/page.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `Button`/`Input`/`Label`/`Card`/`CardHeader`/`CardTitle`/`CardContent` (`@/components/ui/*`), `api` (`@/lib/api`), `usePermission` (`@/hooks/usePermission`).
- Produces: `CategoryResponse`, `ProductResponse`, `CreateCategoryRequest`, `CreateProductRequest`, `UpdateProductRequest` types (`@/types/product`) — Task 2/3 import these. `CategoryPanel({ selectedCategoryId, onSelectCategory })` — Task 2's page wires this in; `onSelectCategory(categoryId: string | null)` is called when a category is clicked (`null` means "Todas").

- [ ] **Step 1: `src/types/product.ts`**

```typescript
export interface CategoryResponse {
  id: string;
  name: string;
  active: boolean;
}

export interface CreateCategoryRequest {
  name: string;
}

export interface ProductResponse {
  id: string;
  categoryId: string;
  internalCode: string;
  barcode: string | null;
  description: string;
  unit: string;
  cost: string | null;
  salePrice: string | null;
  wholesalePrice: string | null;
  taxRate: string;
  tracksInventory: boolean;
  active: boolean;
}

export interface CreateProductRequest {
  categoryId: string;
  internalCode: string;
  barcode: string | null;
  description: string;
  unit: string;
  cost: string;
  salePrice: string;
  wholesalePrice: string;
  taxRate: string;
  tracksInventory: boolean;
}

export interface UpdateProductRequest {
  categoryId: string;
  description: string;
  unit: string;
  cost: string;
  salePrice: string;
  wholesalePrice: string;
  taxRate: string;
  tracksInventory: boolean;
  active: boolean;
}
```

- [ ] **Step 2: `src/components/products/CategoryPanel.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";
import type { CategoryResponse } from "@/types/product";

async function fetchCategories(): Promise<CategoryResponse[]> {
  const res = await api.get<{ data: CategoryResponse[] }>("/api/categories");
  return res.data.data;
}

const categorySchema = z.object({ name: z.string().min(1, "Nombre requerido") });
type CategoryForm = z.infer<typeof categorySchema>;

interface CategoryPanelProps {
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryPanel({ selectedCategoryId, onSelectCategory }: CategoryPanelProps) {
  const queryClient = useQueryClient();
  const canCreate = usePermission("INVENTORY_CREATE");
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CategoryForm>({ resolver: zodResolver(categorySchema) });

  const mutation = useMutation({
    mutationFn: (values: CategoryForm) => api.post("/api/categories", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      reset();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al crear categoria";
      toast.error(message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={cn(
            "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
            selectedCategoryId === null && "bg-accent font-medium"
          )}
        >
          Todas
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
              selectedCategoryId === cat.id && "bg-accent font-medium"
            )}
          >
            {cat.name}
          </button>
        ))}
        {canCreate && (
          <form
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            className="flex gap-2 pt-2"
          >
            <Input placeholder="Nueva categoria" {...register("name")} />
            <Button type="submit" size="sm" disabled={isSubmitting}>
              +
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: `src/app/(dashboard)/products/page.tsx`** (category panel only for now — product table comes in Task 2)

```tsx
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
```

- [ ] **Step 4: Add "Productos" to the sidebar, gated by `INVENTORY_VIEW`**

In `src/components/layout/Sidebar.tsx`, add the import `Package` to the `lucide-react` import line (`import { LayoutDashboard, Building2, Package } from "lucide-react";`) and add this entry to `NAV_ITEMS` (after the "Sucursales" entry):

```typescript
  { href: "/products", label: "Productos", icon: Package, permission: "INVENTORY_VIEW" },
```

- [ ] **Step 5: Verify the build**

```bash
cd apps/web
npm run build
```
Expected: build succeeds, `/products` route listed.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat: add /products page with category panel"
```

---

### Task 2: Product table + create/edit dialog

**Files:**
- Create: `apps/web/src/components/products/ProductFormDialog.tsx`
- Create: `apps/web/src/components/products/ProductTable.tsx`
- Modify: `apps/web/src/app/(dashboard)/products/page.tsx`

**Interfaces:**
- Consumes: `CategoryResponse`/`ProductResponse`/`CreateProductRequest`/`UpdateProductRequest` (`@/types/product`, Task 1), `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter`/`DialogTrigger` (`@/components/ui/dialog`, Branches/Registers module), `CategoryPanel` (Task 1).
- Produces: `ProductFormDialog({ product?, categories, trigger })`, `ProductTable({ categoryId })` — both self-contained, no other task depends on their internals.

- [ ] **Step 1: `src/components/products/ProductFormDialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import type { CategoryResponse, ProductResponse } from "@/types/product";

const createSchema = z.object({
  categoryId: z.string().min(1, "Categoria requerida"),
  internalCode: z.string().min(1, "Codigo requerido"),
  barcode: z.string().optional(),
  description: z.string().min(1, "Descripcion requerida"),
  unit: z.string().min(1, "Unidad requerida"),
  cost: z.string().min(1, "Costo requerido"),
  salePrice: z.string().min(1, "Precio de venta requerido"),
  wholesalePrice: z.string().min(1, "Precio mayorista requerido"),
  taxRate: z.string().min(1, "Tasa de impuesto requerida"),
  tracksInventory: z.boolean(),
});
type ProductForm = z.infer<typeof createSchema>;

interface ProductFormDialogProps {
  product?: ProductResponse;
  categories: CategoryResponse[];
  trigger: React.ReactNode;
}

export function ProductFormDialog({ product, categories, trigger }: ProductFormDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      categoryId: product?.categoryId ?? "",
      internalCode: product?.internalCode ?? "",
      barcode: product?.barcode ?? "",
      description: product?.description ?? "",
      unit: product?.unit ?? "",
      cost: product?.cost ?? "",
      salePrice: product?.salePrice ?? "",
      wholesalePrice: product?.wholesalePrice ?? "",
      taxRate: product?.taxRate ?? "",
      tracksInventory: product?.tracksInventory ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ProductForm) =>
      isEdit
        ? api.put(`/api/products/${product!.id}`, {
            categoryId: values.categoryId,
            description: values.description,
            unit: values.unit,
            cost: values.cost,
            salePrice: values.salePrice,
            wholesalePrice: values.wholesalePrice,
            taxRate: values.taxRate,
            tracksInventory: values.tracksInventory,
            active: product!.active,
          })
        : api.post("/api/products", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      reset();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al guardar";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-category">Categoria</Label>
            <select
              id="product-category"
              {...register("categoryId")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecciona una categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
          </div>
          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="product-code">Codigo interno</Label>
                <Input id="product-code" {...register("internalCode")} />
                {errors.internalCode && <p className="text-sm text-destructive">{errors.internalCode.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-barcode">Codigo de barras (opcional)</Label>
                <Input id="product-barcode" {...register("barcode")} />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="product-description">Descripcion</Label>
            <Input id="product-description" {...register("description")} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-unit">Unidad</Label>
            <Input id="product-unit" {...register("unit")} />
            {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="product-cost">Costo</Label>
              <Input id="product-cost" {...register("cost")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-sale-price">Precio venta</Label>
              <Input id="product-sale-price" {...register("salePrice")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-wholesale-price">Precio mayorista</Label>
              <Input id="product-wholesale-price" {...register("wholesalePrice")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-tax-rate">Tasa de impuesto (%)</Label>
            <Input id="product-tax-rate" {...register("taxRate")} />
          </div>
          <div className="flex items-center gap-2">
            <input id="product-tracks-inventory" type="checkbox" {...register("tracksInventory")} />
            <Label htmlFor="product-tracks-inventory">Rastrea inventario</Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: `src/components/products/ProductTable.tsx`**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";
import { ProductFormDialog } from "./ProductFormDialog";
import type { CategoryResponse, ProductResponse } from "@/types/product";

async function fetchProducts(): Promise<ProductResponse[]> {
  const res = await api.get<{ data: ProductResponse[] }>("/api/products");
  return res.data.data;
}

async function fetchCategories(): Promise<CategoryResponse[]> {
  const res = await api.get<{ data: CategoryResponse[] }>("/api/categories");
  return res.data.data;
}

export function ProductTable({ categoryId }: { categoryId: string | null }) {
  const canCreate = usePermission("INVENTORY_CREATE");
  const canEdit = usePermission("INVENTORY_EDIT");
  const { data: products, isLoading } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const filtered = categoryId ? products?.filter((p) => p.categoryId === categoryId) : products;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Catalogo</h2>
        {canCreate && categories && (
          <ProductFormDialog
            categories={categories}
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Nuevo producto
              </Button>
            }
          />
        )}
      </div>
      {isLoading && <p className="text-muted-foreground">Cargando productos...</p>}
      {filtered && filtered.length === 0 && <p className="text-muted-foreground">No hay productos en esta categoria.</p>}
      {filtered && filtered.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2">Codigo</th>
              <th className="py-2">Descripcion</th>
              <th className="py-2">Costo</th>
              <th className="py-2">Precio</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id} className="border-b border-border">
                <td className="py-2">{product.internalCode}</td>
                <td className="py-2">{product.description}</td>
                <td className="py-2">{product.cost ?? "—"}</td>
                <td className="py-2">{product.salePrice ?? "—"}</td>
                <td className="py-2 text-right">
                  {canEdit && categories && (
                    <ProductFormDialog
                      product={product}
                      categories={categories}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Editar ${product.description}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire `ProductTable` into `/products`**

Replace the full contents of `src/app/(dashboard)/products/page.tsx`:

```tsx
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
```

- [ ] **Step 4: Verify the build**

```bash
cd apps/web
npm run build
```
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: add product table with create/edit dialog to /products"
```

---

### Task 3: `/inventory` page — stock view + manual adjustment

**Files:**
- Create: `apps/web/src/components/inventory/AdjustStockDialog.tsx`
- Create: `apps/web/src/components/inventory/InventoryTable.tsx`
- Create: `apps/web/src/app/(dashboard)/inventory/page.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `BranchResponse` (`@/types/branch`, Branches/Registers module), `ProductResponse` (`@/types/product`, Task 1).
- Produces: `BranchInventoryResponse`, `CreateInventoryMovementRequest` types added to `@/types/product`; `AdjustStockDialog({ branchId, productId, productName, trigger })`.

- [ ] **Step 1: Add inventory types to `src/types/product.ts`**

Append to the existing file:

```typescript
export interface BranchInventoryResponse {
  productId: string;
  currentStock: number;
  minStock: number;
  maxStock: number | null;
}

export type InventoryMovementType = "ENTRY" | "EXIT" | "ADJUSTMENT";

export interface CreateInventoryMovementRequest {
  branchId: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
}
```

- [ ] **Step 2: `src/components/inventory/AdjustStockDialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

const adjustSchema = z.object({
  type: z.enum(["ENTRY", "EXIT", "ADJUSTMENT"]),
  quantity: z.coerce.number().int().positive("Cantidad debe ser mayor a cero"),
  reason: z.string().min(1, "Motivo requerido"),
});
type AdjustForm = z.infer<typeof adjustSchema>;

interface AdjustStockDialogProps {
  branchId: string;
  productId: string;
  productName: string;
  trigger: React.ReactNode;
}

export function AdjustStockDialog({ branchId, productId, productName, trigger }: AdjustStockDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustForm>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { type: "ENTRY", quantity: 1, reason: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: AdjustForm) =>
      api.post("/api/inventory/movements", { branchId, productId, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", branchId] });
      setOpen(false);
      reset();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al ajustar stock";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar stock de {productName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjust-type">Tipo</Label>
            <select
              id="adjust-type"
              {...register("type")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ENTRY">Entrada</option>
              <option value="EXIT">Salida</option>
              <option value="ADJUSTMENT">Ajuste</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjust-quantity">Cantidad</Label>
            <Input id="adjust-quantity" type="number" min={1} {...register("quantity")} />
            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjust-reason">Motivo</Label>
            <Input id="adjust-reason" {...register("reason")} />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: `src/components/inventory/InventoryTable.tsx`**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { Button } from "@/components/ui/button";
import type { BranchInventoryResponse, ProductResponse } from "@/types/product";

async function fetchInventory(branchId: string): Promise<BranchInventoryResponse[]> {
  const res = await api.get<{ data: BranchInventoryResponse[] }>(`/api/inventory/branch/${branchId}`);
  return res.data.data;
}

async function fetchProducts(): Promise<ProductResponse[]> {
  const res = await api.get<{ data: ProductResponse[] }>("/api/products");
  return res.data.data;
}

export function InventoryTable({ branchId }: { branchId: string }) {
  const canAdjust = usePermission("INVENTORY_ADJUST");
  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory", branchId],
    queryFn: () => fetchInventory(branchId),
  });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const productName = (productId: string) => products?.find((p) => p.id === productId)?.description ?? productId;

  if (isLoading) return <p className="text-muted-foreground">Cargando inventario...</p>;
  if (inventory && inventory.length === 0) {
    return <p className="text-muted-foreground">Esta sucursal no tiene productos con inventario registrado.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="py-2">Producto</th>
          <th className="py-2">Stock actual</th>
          <th className="py-2">Minimo</th>
          <th className="py-2">Maximo</th>
          <th className="py-2"></th>
        </tr>
      </thead>
      <tbody>
        {inventory?.map((item) => (
          <tr
            key={item.productId}
            className={cn("border-b border-border", item.currentStock < item.minStock && "bg-amber-500/10")}
          >
            <td className="py-2">{productName(item.productId)}</td>
            <td className="py-2">{item.currentStock}</td>
            <td className="py-2">{item.minStock}</td>
            <td className="py-2">{item.maxStock ?? "—"}</td>
            <td className="py-2 text-right">
              {canAdjust && (
                <AdjustStockDialog
                  branchId={branchId}
                  productId={item.productId}
                  productName={productName(item.productId)}
                  trigger={<Button size="sm">Ajustar stock</Button>}
                />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: `src/app/(dashboard)/inventory/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import type { BranchResponse } from "@/types/branch";

async function fetchBranches(): Promise<BranchResponse[]> {
  const res = await api.get<{ data: BranchResponse[] }>("/api/branches");
  return res.data.data;
}

export default function InventoryPage() {
  const [branchId, setBranchId] = useState<string>("");
  const { data: branches } = useQuery({ queryKey: ["branches"], queryFn: fetchBranches });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Inventario</h1>
      <div className="max-w-xs space-y-2">
        <label htmlFor="branch-select" className="text-sm font-medium">
          Sucursal
        </label>
        <select
          id="branch-select"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Selecciona una sucursal</option>
          {branches?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      {branchId && <InventoryTable branchId={branchId} />}
    </div>
  );
}
```

- [ ] **Step 5: Add "Inventario" to the sidebar**

In `src/components/layout/Sidebar.tsx`, add `Boxes` to the `lucide-react` import (`import { LayoutDashboard, Building2, Package, Boxes } from "lucide-react";`) and add this entry to `NAV_ITEMS` (after "Productos"):

```typescript
  { href: "/inventory", label: "Inventario", icon: Boxes, permission: "INVENTORY_VIEW" },
```

- [ ] **Step 6: Verify the build**

```bash
cd apps/web
npm run build
```
Expected: build succeeds, `/inventory` route listed.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat: add /inventory page with branch stock view and manual adjustment"
```

---

### Task 4: Playwright E2E tests

**Files:**
- Create: `apps/web/e2e/products.spec.ts`
- Create: `apps/web/e2e/inventory.spec.ts`

**Interfaces:**
- Consumes: the running Next.js dev server and backend (same convention as prior modules — no mocking).

- [ ] **Step 1: `e2e/products.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test("crear categoria, crear producto, editar producto", async ({ page }) => {
  const uniqueEmail = `e2e-products-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill("Reposteria Products E2E");
  await page.getByLabel("Tu nombre").fill("Admin Products");
  await page.getByLabel("Correo").fill(uniqueEmail);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Productos" }).click();
  await expect(page).toHaveURL(/\/products/);

  await page.getByPlaceholder("Nueva categoria").fill("Bizcochos");
  await page.getByRole("button", { name: "+" }).click();
  await expect(page.getByText("Bizcochos")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo producto" }).click();
  await page.getByLabel("Categoria").selectOption({ label: "Bizcochos" });
  await page.getByLabel("Codigo interno").fill("BIZ-001");
  await page.getByLabel("Descripcion").fill("Bizcocho de chocolate");
  await page.getByLabel("Unidad").fill("unidad");
  await page.getByLabel("Costo").fill("100.00");
  await page.getByLabel("Precio venta").fill("250.00");
  await page.getByLabel("Precio mayorista").fill("200.00");
  await page.getByLabel("Tasa de impuesto (%)").fill("0");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Bizcocho de chocolate")).toBeVisible();

  await page.getByRole("button", { name: "Editar Bizcocho de chocolate" }).click();
  await page.getByLabel("Descripcion").fill("Bizcocho de chocolate premium");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Bizcocho de chocolate premium")).toBeVisible();
});
```

- [ ] **Step 2: `e2e/inventory.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test("seleccionar sucursal y ajustar stock", async ({ page }) => {
  const uniqueEmail = `e2e-inventory-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill("Reposteria Inventory E2E");
  await page.getByLabel("Tu nombre").fill("Admin Inventory");
  await page.getByLabel("Correo").fill(uniqueEmail);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Sucursales" }).click();
  await page.getByRole("button", { name: "Nueva sucursal" }).click();
  await page.getByLabel("Nombre").fill("Sucursal Centro");
  await page.getByLabel("Direccion").fill("Calle Duarte 12");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Sucursal Centro")).toBeVisible();

  await page.getByRole("link", { name: "Productos" }).click();
  await page.getByPlaceholder("Nueva categoria").fill("Bizcochos");
  await page.getByRole("button", { name: "+" }).click();
  await expect(page.getByText("Bizcochos")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo producto" }).click();
  await page.getByLabel("Categoria").selectOption({ label: "Bizcochos" });
  await page.getByLabel("Codigo interno").fill("BIZ-001");
  await page.getByLabel("Descripcion").fill("Bizcocho de chocolate");
  await page.getByLabel("Unidad").fill("unidad");
  await page.getByLabel("Costo").fill("100.00");
  await page.getByLabel("Precio venta").fill("250.00");
  await page.getByLabel("Precio mayorista").fill("200.00");
  await page.getByLabel("Tasa de impuesto (%)").fill("0");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Bizcocho de chocolate")).toBeVisible();

  await page.getByRole("link", { name: "Inventario" }).click();
  await expect(page).toHaveURL(/\/inventory/);
  await page.getByLabel("Sucursal").selectOption({ label: "Sucursal Centro" });
  await expect(page.getByText("Bizcocho de chocolate")).toBeVisible();

  await page.getByRole("button", { name: "Ajustar stock" }).click();
  await page.getByLabel("Cantidad").fill("10");
  await page.getByLabel("Motivo").fill("Compra inicial");
  await page.getByRole("button", { name: "Guardar" }).click();

  const row = page.locator("tr", { hasText: "Bizcocho de chocolate" });
  await expect(row.locator("td").nth(1)).toHaveText("10");
});
```

- [ ] **Step 3: Run the E2E suite**

Backend must be running locally first (test profile, same as prior modules).

```bash
cd apps/web
npm run test:e2e
```
Expected: 5 passed (this new pair plus the three from prior modules).

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "test: add Playwright E2E coverage for Products/Categories/Inventory"
```

---

## What comes after this plan

Next modules, each its own spec→plan→build cycle: CashShift open/close + denomination counting UI, the POS/Sale screen, Credit/CuentasPorCobrar screens, and the real Dashboard (Fase 2).
