"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plus, WalletCards } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { PRODUCT_UNITS, productUnitLabel } from "@/lib/product-units";
import { usePermission } from "@/hooks/usePermission";
import { useSoleBranch } from "@/hooks/useSoleBranch";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/page-header";
import { PermissionDenied } from "@/components/common/permission-denied";
import { ModuleDisabled } from "@/components/common/module-disabled";
import { EmptyState } from "@/components/common/empty-state";
import type { BranchResponse } from "@/types/branch";
import type { CategoryResponse, CreateProductRequest, ProductResponse } from "@/types/product";
import { money } from "@/lib/money";
import { purchaseStatusLabel } from "@/lib/status-labels";
import type {
  CreatePurchaseRequest,
  PurchaseItemRequest,
  PurchasePaymentMethod,
  PurchaseResponse,
  RecordPurchasePaymentRequest,
  SupplierRequest,
  SupplierResponse,
} from "@/types/purchase";

type Tab = "purchases" | "suppliers";

async function fetchSuppliers(includeInactive = false): Promise<SupplierResponse[]> {
  const res = await api.get<{ data: SupplierResponse[] }>("/api/suppliers", { params: { includeInactive } });
  return res.data.data;
}

async function fetchPurchases(): Promise<PurchaseResponse[]> {
  const res = await api.get<{ data: PurchaseResponse[] }>("/api/purchases");
  return res.data.data;
}

async function fetchProducts(): Promise<ProductResponse[]> {
  const res = await api.get<{ data: ProductResponse[] }>("/api/products");
  return res.data.data;
}

async function fetchCategories(): Promise<CategoryResponse[]> {
  const res = await api.get<{ data: CategoryResponse[] }>("/api/categories");
  return res.data.data;
}



function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function SupplierDialog({ supplier }: { supplier?: SupplierResponse }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SupplierRequest>({
    name: supplier?.name ?? "",
    contactName: supplier?.contactName ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    address: supplier?.address ?? "",
    taxId: supplier?.taxId ?? "",
    notes: supplier?.notes ?? "",
    active: supplier?.active ?? true,
  });
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values: SupplierRequest) =>
      supplier ? api.put(`/api/suppliers/${supplier.id}`, values) : api.post("/api/suppliers", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setOpen(false);
      toast.success(supplier ? "Proveedor actualizado" : "Proveedor creado");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo guardar el proveedor";
      toast.error(message);
    },
  });

  const update = (key: keyof SupplierRequest, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {supplier ? (
          <Button variant="ghost" size="sm">Editar</Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo proveedor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({
              ...form,
              name: form.name.trim(),
              contactName: emptyToNull(form.contactName ?? ""),
              phone: emptyToNull(form.phone ?? ""),
              email: emptyToNull(form.email ?? ""),
              address: emptyToNull(form.address ?? ""),
              taxId: emptyToNull(form.taxId ?? ""),
              notes: emptyToNull(form.notes ?? ""),
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplier-name">Nombre</Label>
              <Input id="supplier-name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-contact">Contacto</Label>
              <Input id="supplier-contact" value={form.contactName ?? ""} onChange={(e) => update("contactName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-phone">Telefono</Label>
              <Input id="supplier-phone" value={form.phone ?? ""} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-email">Email</Label>
              <Input id="supplier-email" value={form.email ?? ""} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-tax-id">Documento fiscal</Label>
              <Input id="supplier-tax-id" value={form.taxId ?? ""} onChange={(e) => update("taxId", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-address">Direccion</Label>
              <Input id="supplier-address" value={form.address ?? ""} onChange={(e) => update("address", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-notes">Notas</Label>
            <Input id="supplier-notes" value={form.notes ?? ""} onChange={(e) => update("notes", e.target.value)} />
          </div>
          {supplier && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(form.active)} onChange={(e) => update("active", e.target.checked)} />
              Activo
            </label>
          )}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !form.name.trim()}>
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickProductDialog({
  categories,
  trigger,
  onCreated,
}: {
  categories: CategoryResponse[];
  trigger: React.ReactNode;
  onCreated: (product: ProductResponse) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateProductRequest>({
    categoryId: "",
    internalCode: "",
    barcode: null,
    description: "",
    unit: "unit",
    cost: "0",
    salePrice: "0",
    wholesalePrice: "0",
    taxRate: "0",
    tracksInventory: true,
    rentable: false,
  });
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (values: CreateProductRequest) => {
      const res = await api.post<{ data: ProductResponse }>("/api/products", {
        ...values,
        categoryId: values.categoryId || undefined,
        barcode: values.barcode || undefined,
      });
      return res.data.data;
    },
    onSuccess: (product) => {
      queryClient.setQueryData<ProductResponse[]>(["products"], (current) => {
        if (!current || current.some((item) => item.id === product.id)) return current;
        return [...current, product].sort((a, b) => a.description.localeCompare(b.description));
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onCreated(product);
      setForm({
        categoryId: "",
        internalCode: "",
        barcode: null,
        description: "",
        unit: "unit",
        cost: "0",
        salePrice: "0",
        wholesalePrice: "0",
        taxRate: "0",
        tracksInventory: true,
        rentable: false,
      });
      setOpen(false);
      toast.success("Producto creado");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo crear el producto";
      toast.error(message);
    },
  });

  const update = (key: keyof CreateProductRequest, value: string | boolean | null) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({
              ...form,
              internalCode: form.internalCode.trim(),
              barcode: emptyToNull(form.barcode ?? ""),
              description: form.description.trim(),
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quick-product-code">Codigo interno</Label>
              <Input id="quick-product-code" value={form.internalCode} onChange={(e) => update("internalCode", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-product-barcode">Codigo de barras</Label>
              <Input id="quick-product-barcode" value={form.barcode ?? ""} onChange={(e) => update("barcode", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="quick-product-description">Descripcion</Label>
              <Input id="quick-product-description" value={form.description} onChange={(e) => update("description", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-product-category">Categoria</Label>
              <select
                id="quick-product-category"
                value={form.categoryId}
                onChange={(e) => update("categoryId", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">General (automatico)</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-product-unit">Unidad</Label>
              <select
                id="quick-product-unit"
                value={form.unit}
                onChange={(e) => update("unit", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {PRODUCT_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-product-cost">Costo</Label>
              <Input id="quick-product-cost" type="number" min="0" step="0.01" value={form.cost} onChange={(e) => update("cost", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-product-sale-price">Precio venta</Label>
              <Input id="quick-product-sale-price" type="number" min="0" step="0.01" value={form.salePrice} onChange={(e) => update("salePrice", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-product-wholesale-price">Precio mayorista</Label>
              <Input id="quick-product-wholesale-price" type="number" min="0" step="0.01" value={form.wholesalePrice} onChange={(e) => update("wholesalePrice", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-product-tax-rate">Itbis %</Label>
              <Input id="quick-product-tax-rate" type="number" min="0" step="0.01" value={form.taxRate} onChange={(e) => update("taxRate", e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.tracksInventory} onChange={(e) => update("tracksInventory", e.target.checked)} />
            Rastrea inventario
          </label>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !form.internalCode.trim() || !form.description.trim()}>
              {mutation.isPending ? "Guardando..." : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PurchaseDialog({ suppliers, products, categories, branches, defaultBranchId, canCreateProduct }: {
  suppliers: SupplierResponse[];
  products: ProductResponse[];
  categories: CategoryResponse[];
  branches: BranchResponse[];
  defaultBranchId: string;
  canCreateProduct: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  // `defaultBranchId` lands once the branches query resolves, which is after this dialog mounts.
  // Deriving the effective branch beats syncing it in an effect: the previous effect re-applied the
  // default whenever the field was cleared, so falling back here reproduces that exactly without the
  // extra render pass.
  const [pickedBranchId, setPickedBranchId] = useState("");
  const branchId = pickedBranchId || defaultBranchId;
  const setBranchId = setPickedBranchId;
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItemRequest[]>([
    { productId: "", quantity: 1, unitCost: "0", taxRate: "0", discountAmount: "0" },
  ]);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: CreatePurchaseRequest) => api.post("/api/purchases", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      setOpen(false);
      toast.success("Compra creada");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo crear la compra";
      toast.error(message);
    },
  });

  const total = items.reduce((sum, item) => {
    const subtotal = Number(item.unitCost || 0) * Number(item.quantity || 0);
    const discount = Number(item.discountAmount || 0);
    const tax = Math.max(0, subtotal - discount) * (Number(item.taxRate || 0) / 100);
    return sum + Math.max(0, subtotal - discount) + tax;
  }, 0);

  const updateItem = (index: number, patch: Partial<PurchaseItemRequest>) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nueva compra
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Nueva compra</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({
              supplierId,
              branchId,
              invoiceNumber: emptyToNull(invoiceNumber),
              purchasedAt: null,
              notes: emptyToNull(notes),
              items: items.filter((item) => item.productId),
            });
          }}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="purchase-supplier">Proveedor</Label>
              <select id="purchase-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecciona</option>
                {suppliers.filter((s) => s.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-branch">Sucursal</Label>
              <select id="purchase-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecciona</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-invoice">Factura proveedor</Label>
              <Input id="purchase-invoice" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_90px_120px_100px_120px_auto] md:items-end">
                <div className="space-y-2">
                  <Label>Producto</Label>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select value={item.productId} onChange={(e) => updateItem(index, { productId: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Selecciona</option>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.description} ({productUnitLabel(product.unit)})</option>)}
                    </select>
                    {canCreateProduct && (
                      <QuickProductDialog
                        categories={categories}
                        trigger={<Button type="button" variant="outline" className="w-full sm:w-auto"><Plus className="h-4 w-4" /> Nuevo</Button>}
                        onCreated={(product) => updateItem(index, { productId: product.id, unitCost: product.cost ?? item.unitCost })}
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cant.</Label>
                  <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Costo</Label>
                  <Input type="number" min="0" step="0.01" value={item.unitCost} onChange={(e) => updateItem(index, { unitCost: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Itbis %</Label>
                  <Input type="number" min="0" step="0.01" value={item.taxRate} onChange={(e) => updateItem(index, { taxRate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Desc.</Label>
                  <Input type="number" min="0" step="0.01" value={item.discountAmount} onChange={(e) => updateItem(index, { discountAmount: e.target.value })} />
                </div>
                <Button type="button" variant="ghost" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>
                  Quitar
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setItems((current) => [...current, { productId: "", quantity: 1, unitCost: "0", taxRate: "0", discountAmount: "0" }])}>
              <Plus className="h-4 w-4" />
              Agregar producto
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_220px] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="purchase-notes">Notas</Label>
              <Input id="purchase-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="rounded-lg border border-border p-3 text-right">
              <p className="text-xs text-muted-foreground">Total estimado</p>
              <p className="font-mono-money text-xl font-bold">{money(total)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !supplierId || !branchId || items.every((item) => !item.productId)}>
              {mutation.isPending ? "Guardando..." : "Guardar compra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PurchasePaymentDialog({ purchase }: { purchase: PurchaseResponse }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(purchase.balanceDue);
  const [method, setMethod] = useState<PurchasePaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: RecordPurchasePaymentRequest) => api.post(`/api/purchases/${purchase.id}/payments`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
      setOpen(false);
      toast.success("Pago registrado");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo registrar el pago";
      toast.error(message);
    },
  });

  const balance = Number(purchase.balanceDue);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setAmount(purchase.balanceDue);
          setMethod("CASH");
          setReference("");
          setNotes("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <WalletCards className="h-4 w-4" />
          Abonar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago a proveedor</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({
              amount,
              method,
              paidAt: null,
              reference: emptyToNull(reference),
              notes: emptyToNull(notes),
            });
          }}
        >
          <div className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium">{purchase.purchaseNumber} - {purchase.supplierName}</p>
            <p className="text-muted-foreground">Pendiente: <span className="font-mono-money">{money(purchase.balanceDue)}</span></p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`purchase-payment-amount-${purchase.id}`}>Monto</Label>
              <Input
                id={`purchase-payment-amount-${purchase.id}`}
                type="number"
                min="0.01"
                max={purchase.balanceDue}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`purchase-payment-method-${purchase.id}`}>Metodo</Label>
              <select
                id={`purchase-payment-method-${purchase.id}`}
                value={method}
                onChange={(e) => setMethod(e.target.value as PurchasePaymentMethod)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`purchase-payment-reference-${purchase.id}`}>Referencia</Label>
            <Input id={`purchase-payment-reference-${purchase.id}`} value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`purchase-payment-notes-${purchase.id}`}>Notas</Label>
            <Input id={`purchase-payment-notes-${purchase.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || Number(amount) <= 0 || Number(amount) > balance}>
              {mutation.isPending ? "Registrando..." : "Registrar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PurchasesPage() {
  const [tab, setTab] = useState<Tab>("purchases");
  const canViewPurchases = usePermission("PURCHASE_VIEW");
  const canCreatePurchase = usePermission("PURCHASE_CREATE");
  const canReceivePurchase = usePermission("PURCHASE_RECEIVE");
  const canRecordPurchasePayment = usePermission("PURCHASE_PAYMENT_RECORD");
  const canCreateProduct = usePermission("INVENTORY_CREATE");
  const canViewSuppliers = usePermission("SUPPLIER_VIEW") || canViewPurchases;
  const canManageSuppliers = usePermission("SUPPLIER_MANAGE");
  const tenantFeatures = useTenantFeatures();
  const purchaseModuleEnabled = tenantFeatures.purchaseModuleEnabled;
  const queryClient = useQueryClient();
  const { branches, soleBranchId } = useSoleBranch(purchaseModuleEnabled && (canViewPurchases || canCreatePurchase));

  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => fetchSuppliers(true), enabled: purchaseModuleEnabled && canViewSuppliers });
  const { data: purchases = [], isLoading: loadingPurchases } = useQuery({ queryKey: ["purchases"], queryFn: fetchPurchases, enabled: purchaseModuleEnabled && canViewPurchases });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: fetchProducts, enabled: purchaseModuleEnabled && canCreatePurchase });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories, enabled: purchaseModuleEnabled && canCreatePurchase && canCreateProduct });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/purchases/${id}/receive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Compra recibida e inventario actualizado");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo recibir la compra";
      toast.error(message);
    },
  });

  const metrics = useMemo(() => ({
    draft: purchases.filter((purchase) => purchase.status === "DRAFT").length,
    received: purchases.filter((purchase) => purchase.status === "RECEIVED").length,
    total: purchases.reduce((sum, purchase) => sum + Number(purchase.total), 0),
  }), [purchases]);

  if (!canViewPurchases && !canViewSuppliers) {
    return <PermissionDenied title="Compras" message="No tienes permiso para consultar compras o proveedores." />;
  }

  if (!purchaseModuleEnabled) {
    return <ModuleDisabled title="Compras" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores y compras"
        description="Registra proveedores, compras y recepciones de inventario."
        actions={
          <>
            {canManageSuppliers && <SupplierDialog />}
            {canCreatePurchase && (
              <PurchaseDialog
                suppliers={suppliers}
                products={products}
                categories={categories}
                branches={branches}
                defaultBranchId={soleBranchId ?? ""}
                canCreateProduct={canCreateProduct}
              />
            )}
          </>
        }
      />

      {canViewPurchases && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Borradores</p><p className="text-2xl font-bold">{metrics.draft}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Recibidas</p><p className="text-2xl font-bold">{metrics.received}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Total comprado</p><p className="font-mono-money text-2xl font-bold">{money(metrics.total)}</p></CardContent></Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-border">
        {canViewPurchases && <button type="button" onClick={() => setTab("purchases")} className={cn("border-b-2 px-3 py-2 text-sm font-medium", tab === "purchases" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>Compras</button>}
        {canViewSuppliers && <button type="button" onClick={() => setTab("suppliers")} className={cn("border-b-2 px-3 py-2 text-sm font-medium", tab === "suppliers" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>Proveedores</button>}
      </div>

      {tab === "purchases" && canViewPurchases ? (
        <Card>
          <CardHeader><CardTitle>Historial de compras</CardTitle></CardHeader>
          <CardContent>
            {loadingPurchases && <p className="text-sm text-muted-foreground">Cargando compras...</p>}
            {!loadingPurchases && purchases.length === 0 && <EmptyState message="No hay compras registradas." />}
            {purchases.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-3">Compra</th>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3">Sucursal</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Pendiente</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase) => (
                      <tr key={purchase.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{purchase.purchaseNumber}</td>
                        <td className="px-4 py-3">{purchase.supplierName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{purchase.branchName}</td>
                        <td className="px-4 py-3"><Badge variant={purchase.status === "RECEIVED" ? "success" : "secondary"}>{purchaseStatusLabel(purchase.status)}</Badge></td>
                        <td className="px-4 py-3 text-right font-mono-money font-semibold">{money(purchase.total)}</td>
                        <td className="px-4 py-3 text-right font-mono-money text-warning">{money(purchase.balanceDue)}</td>
                        <td className="max-w-sm px-4 py-3 text-muted-foreground">{purchase.items.map((item) => `${item.productName} x ${item.quantity}`).join(", ")}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {purchase.status === "DRAFT" && canReceivePurchase && (
                              <Button size="sm" variant="outline" disabled={receiveMutation.isPending} onClick={() => receiveMutation.mutate(purchase.id)}>
                                <CheckCircle2 className="h-4 w-4" />
                                Recibir
                              </Button>
                            )}
                            {purchase.status === "RECEIVED" && canRecordPurchasePayment && Number(purchase.balanceDue) > 0 && (
                              <PurchasePaymentDialog purchase={purchase} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Proveedores</CardTitle></CardHeader>
          <CardContent>
            {suppliers.length === 0 ? (
              <EmptyState message="No hay proveedores registrados." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3">Contacto</th>
                      <th className="px-4 py-3">Telefono</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr key={supplier.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{supplier.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{supplier.contactName ?? "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{supplier.phone ?? "-"}</td>
                        <td className="px-4 py-3"><Badge variant={supplier.active ? "success" : "secondary"}>{supplier.active ? "Activo" : "Inactivo"}</Badge></td>
                        <td className="px-4 py-3 text-right">{canManageSuppliers && <SupplierDialog supplier={supplier} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
