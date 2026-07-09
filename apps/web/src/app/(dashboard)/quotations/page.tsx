"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { productUnitLabel } from "@/lib/product-units";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomerResponse } from "@/types/customer";
import type { ProductResponse } from "@/types/product";
import type { CreateQuotationRequest, QuotationResponse } from "@/types/quotation";

interface DraftItem {
  productId: string;
  quantity: number;
  useWholesalePrice: boolean;
}

async function fetchQuotations(): Promise<QuotationResponse[]> {
  const res = await api.get<{ data: QuotationResponse[] }>("/api/quotations");
  return res.data.data;
}

async function fetchProducts(): Promise<ProductResponse[]> {
  const res = await api.get<{ data: ProductResponse[] }>("/api/products");
  return res.data.data;
}

async function fetchCustomers(): Promise<CustomerResponse[]> {
  const res = await api.get<{ data: CustomerResponse[] }>("/api/customers", { params: { size: 500 } });
  return res.data.data;
}

function money(value: string | number | null | undefined): string {
  return `RD$${Number(value ?? 0).toFixed(2)}`;
}

function dateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function statusLabel(status: QuotationResponse["status"]): string {
  const labels: Record<QuotationResponse["status"], string> = {
    DRAFT: "Borrador",
    SENT: "Enviada",
    ACCEPTED: "Aceptada",
    EXPIRED: "Vencida",
    CANCELLED: "Cancelada",
  };
  return labels[status];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function printQuotation(quotation: QuotationResponse) {
  const rows = quotation.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.productName)}</td>
          <td>${item.quantity} ${escapeHtml(productUnitLabel(item.productUnit))}</td>
          <td>${money(item.unitPrice)}</td>
          <td class="right">${money(item.lineTotal)}</td>
        </tr>
      `
    )
    .join("");
  const popup = window.open("", "_blank", "width=720,height=900");
  if (!popup) return;
  popup.document.write(`
    <html>
      <head>
        <title>${escapeHtml(quotation.quotationNumber)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
          h1 { font-size: 24px; margin: 0 0 4px; }
          h2 { font-size: 18px; margin: 0 0 24px; font-weight: 500; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; }
          th { color: #475569; font-size: 12px; text-transform: uppercase; }
          .right { text-align: right; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; }
          .totals { margin-left: auto; margin-top: 20px; width: 280px; font-size: 14px; }
          .line { display: flex; justify-content: space-between; padding: 6px 0; }
          .total { border-top: 1px solid #0f172a; font-size: 18px; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>DaleVenta</h1>
        <h2>Cotizacion ${escapeHtml(quotation.quotationNumber)}</h2>
        <div class="meta">
          <div><strong>Cliente:</strong> ${escapeHtml(quotation.customerName)}</div>
          <div><strong>Fecha:</strong> ${escapeHtml(dateTime(quotation.createdAt))}</div>
          <div><strong>Estado:</strong> ${escapeHtml(statusLabel(quotation.status))}</div>
          <div><strong>Valida hasta:</strong> ${escapeHtml(quotation.validUntil ?? "-")}</div>
        </div>
        ${quotation.notes ? `<p><strong>Notas:</strong> ${escapeHtml(quotation.notes)}</p>` : ""}
        <table>
          <thead>
            <tr><th>Producto</th><th>Cant.</th><th>Precio</th><th class="right">Total</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <div class="line"><span>Subtotal</span><span>${money(quotation.subtotal)}</span></div>
          <div class="line"><span>Impuesto</span><span>${money(quotation.taxTotal)}</span></div>
          <div class="line"><span>Descuento</span><span>${money(quotation.discountAmount)}</span></div>
          <div class="line total"><span>Total</span><span>${money(quotation.total)}</span></div>
        </div>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

function QuotationDetail({ quotation }: { quotation: QuotationResponse }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">Numero</p>
          <p className="font-medium">{quotation.quotationNumber}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Cliente</p>
          <p className="font-medium">{quotation.customerName}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Estado</p>
          <p className="font-medium">{statusLabel(quotation.status)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Fecha</p>
          <p className="font-medium">{dateTime(quotation.createdAt)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Valida hasta</p>
          <p className="font-medium">{quotation.validUntil ?? "-"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total</p>
          <p className="font-medium">{money(quotation.total)}</p>
        </div>
      </div>
      {quotation.notes && (
        <div className="rounded-md border border-border p-3 text-sm">
          <p className="text-muted-foreground">Notas</p>
          <p>{quotation.notes}</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2">Producto</th>
              <th className="py-2">Cant.</th>
              <th className="py-2">Precio</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item) => (
              <tr key={item.id} className="border-b border-border">
                <td className="py-2">{item.productName}</td>
                <td className="py-2">
                  {item.quantity} {productUnitLabel(item.productUnit)}
                </td>
                <td className="py-2">{money(item.unitPrice)}</td>
                <td className="py-2 text-right">{money(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ml-auto grid max-w-xs gap-2 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{money(quotation.subtotal)}</span></div>
        <div className="flex justify-between"><span>Impuesto</span><span>{money(quotation.taxTotal)}</span></div>
        <div className="flex justify-between"><span>Descuento</span><span>{money(quotation.discountAmount)}</span></div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
          <span>Total</span><span>{money(quotation.total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function QuotationsPage() {
  const canView = usePermission("SALE_VIEW_HISTORY") || usePermission("SALE_CREATE");
  const canCreate = usePermission("SALE_CREATE");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [useWholesalePrice, setUseWholesalePrice] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);

  const { data: quotations, isLoading, isError } = useQuery({
    queryKey: ["quotations"],
    queryFn: fetchQuotations,
    enabled: canView,
  });
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    enabled: canCreate || canView,
  });
  const { data: customers } = useQuery({
    queryKey: ["customers-all"],
    queryFn: fetchCustomers,
    enabled: canCreate || canView,
  });

  const productById = useMemo(() => new Map((products ?? []).map((product) => [product.id, product])), [products]);
  const activeProducts = useMemo(() => (products ?? []).filter((product) => product.active), [products]);
  const selectedProduct = selectedProductId ? productById.get(selectedProductId) : undefined;
  const draftTotals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    for (const item of items) {
      const product = productById.get(item.productId);
      if (!product) continue;
      const price = Number(item.useWholesalePrice ? product.wholesalePrice : product.salePrice);
      const lineSubtotal = price * item.quantity;
      const lineTax = lineSubtotal * (Number(product.taxRate) / 100);
      subtotal += lineSubtotal;
      taxTotal += lineTax;
    }
    const discount = Number(discountAmount || 0);
    return { subtotal, taxTotal, discount, total: Math.max(subtotal + taxTotal - discount, 0) };
  }, [discountAmount, items, productById]);

  const mutation = useMutation({
    mutationFn: (payload: CreateQuotationRequest) => api.post("/api/quotations", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      setOpen(false);
      setCustomerId("");
      setValidUntil("");
      setDiscountAmount("0");
      setNotes("");
      setItems([]);
      toast.success("Cotizacion creada");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al crear cotizacion";
      toast.error(message);
    },
  });

  const addItem = () => {
    if (!selectedProductId || quantity <= 0) return;
    setItems((current) => {
      const existing = current.find(
        (item) => item.productId === selectedProductId && item.useWholesalePrice === useWholesalePrice
      );
      if (existing) {
        return current.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...current, { productId: selectedProductId, quantity, useWholesalePrice }];
    });
    setSelectedProductId("");
    setQuantity(1);
    setUseWholesalePrice(false);
  };

  const createQuotation = () => {
    mutation.mutate({
      customerId: customerId || null,
      validUntil: validUntil || null,
      discountAmount: discountAmount || "0",
      notes: notes.trim() || undefined,
      items,
    });
  };

  if (!canView) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Cotizaciones</h1>
        <p className="text-sm text-muted-foreground">Tu usuario no tiene permiso para consultar cotizaciones.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cotizaciones</h1>
          <p className="text-sm text-muted-foreground">Propuestas comerciales antes de convertirlas en venta.</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nueva cotizacion</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Nueva cotizacion</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="quotation-customer">Cliente</Label>
                      <select
                        id="quotation-customer"
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Cliente de contado</option>
                        {(customers ?? []).map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quotation-valid-until">Valida hasta</Label>
                      <Input
                        id="quotation-valid-until"
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_120px_140px_auto] md:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="quotation-product">Producto</Label>
                      <select
                        id="quotation-product"
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Selecciona un producto</option>
                        {activeProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.description} - {money(product.salePrice)} / {productUnitLabel(product.unit)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quotation-quantity">Cantidad</Label>
                      <Input
                        id="quotation-quantity"
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                      />
                    </div>
                    <label className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={useWholesalePrice}
                        onChange={(e) => setUseWholesalePrice(e.target.checked)}
                      />
                      Mayoreo
                    </label>
                    <Button type="button" onClick={addItem} disabled={!selectedProduct || quantity <= 0}>
                      Agregar
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="px-3 py-2">Producto</th>
                          <th className="px-3 py-2">Cant.</th>
                          <th className="px-3 py-2">Precio</th>
                          <th className="px-3 py-2 text-right"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td className="px-3 py-6 text-center text-muted-foreground" colSpan={4}>
                              Sin productos agregados.
                            </td>
                          </tr>
                        ) : (
                          items.map((item, index) => {
                            const product = productById.get(item.productId);
                            const price = item.useWholesalePrice ? product?.wholesalePrice : product?.salePrice;
                            return (
                              <tr key={`${item.productId}-${item.useWholesalePrice}`} className="border-b border-border">
                                <td className="px-3 py-2">{product?.description ?? item.productId}</td>
                                <td className="px-3 py-2">
                                  {item.quantity} {productUnitLabel(product?.unit)}
                                </td>
                                <td className="px-3 py-2">{money(price)}</td>
                                <td className="px-3 py-2 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Quitar producto"
                                    onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                    <div className="space-y-2">
                      <Label htmlFor="quotation-discount">Descuento</Label>
                      <Input
                        id="quotation-discount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quotation-notes">Notas</Label>
                      <Input id="quotation-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="rounded-md border border-border p-4">
                  <h2 className="text-base font-semibold">Resumen</h2>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>{money(draftTotals.subtotal)}</span></div>
                    <div className="flex justify-between"><span>Impuesto</span><span>{money(draftTotals.taxTotal)}</span></div>
                    <div className="flex justify-between"><span>Descuento</span><span>{money(draftTotals.discount)}</span></div>
                    <div className="flex justify-between border-t border-border pt-3 text-lg font-semibold">
                      <span>Total</span><span>{money(draftTotals.total)}</span>
                    </div>
                  </div>
                  <Button
                    className="mt-6 w-full"
                    disabled={items.length === 0 || mutation.isPending}
                    onClick={createQuotation}
                  >
                    {mutation.isPending ? "Guardando..." : "Guardar cotizacion"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando cotizaciones...</p>}
      {isError && <p className="text-sm text-destructive">No se pudieron cargar las cotizaciones.</p>}

      <Card>
        <CardHeader>
          <CardTitle>Cotizaciones registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {(quotations ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay cotizaciones registradas todavia.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2">Fecha</th>
                    <th className="py-2">Numero</th>
                    <th className="py-2">Cliente</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2">Valida hasta</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {(quotations ?? []).map((quotation) => (
                    <tr key={quotation.id} className="border-b border-border">
                      <td className="py-2">{dateTime(quotation.createdAt)}</td>
                      <td className="py-2 font-medium">{quotation.quotationNumber}</td>
                      <td className="py-2">{quotation.customerName}</td>
                      <td className="py-2">{statusLabel(quotation.status)}</td>
                      <td className="py-2">{quotation.validUntil ?? "-"}</td>
                      <td className="py-2 text-right font-medium">{money(quotation.total)}</td>
                      <td className="py-2">
                        <div className="flex justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Ver cotizacion">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Detalle de cotizacion</DialogTitle>
                              </DialogHeader>
                              <QuotationDetail quotation={quotation} />
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Imprimir cotizacion"
                            onClick={() => printQuotation(quotation)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
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
    </div>
  );
}
