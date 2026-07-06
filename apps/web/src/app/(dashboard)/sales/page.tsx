"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { useSoleBranch } from "@/hooks/useSoleBranch";
import { useSoleRegister } from "@/hooks/useSoleRegister";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomerResponse } from "@/types/customer";
import type { ProductResponse } from "@/types/product";
import type { SaleResponse } from "@/types/sale";

async function fetchProducts(): Promise<ProductResponse[]> {
  const res = await api.get<{ data: ProductResponse[] }>("/api/products");
  return res.data.data;
}

async function fetchCustomers(): Promise<CustomerResponse[]> {
  const res = await api.get<{ data: CustomerResponse[] }>("/api/customers", { params: { size: 500 } });
  return res.data.data;
}

async function fetchSales(registerId: string): Promise<SaleResponse[]> {
  const res = await api.get<{ data: SaleResponse[] }>("/api/sales", { params: { registerId } });
  return res.data.data;
}

function money(value: string): string {
  return `RD$${Number(value).toFixed(2)}`;
}

function dateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function paymentLabel(sale: SaleResponse): string {
  return sale.payments.map((p) => p.method).join(", ");
}

function StatusBadge({ status }: { status: SaleResponse["status"] }) {
  const styles =
    status === "COMPLETED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${styles}`}>
      {status === "COMPLETED" ? "Completada" : "Anulada"}
    </span>
  );
}

function SaleDetailDialog({
  productName,
  customerName,
  sale,
  trigger,
}: {
  productName: (id: string) => string;
  customerName: (id: string | null) => string;
  sale: SaleResponse;
  trigger: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle de venta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Fecha</p>
              <p className="font-medium">{dateTime(sale.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-medium">{customerName(sale.customerId)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Estado</p>
              <StatusBadge status={sale.status} />
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-medium">{money(sale.total)}</p>
            </div>
          </div>
          {sale.voidReason && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Anulada: {sale.voidReason}
            </div>
          )}
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
              {sale.items.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-2">{productName(item.productId)}</td>
                  <td className="py-2">{item.quantity}</td>
                  <td className="py-2">{money(item.unitPrice)}</td>
                  <td className="py-2 text-right">{money(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>Subtotal: <span className="font-medium">{money(sale.subtotal)}</span></p>
            <p>Impuesto: <span className="font-medium">{money(sale.taxTotal)}</span></p>
            <p>Descuento: <span className="font-medium">{money(sale.discountAmount)}</span></p>
            <p>Pagos: <span className="font-medium">{paymentLabel(sale)}</span></p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VoidSaleDialog({ registerId, sale }: { registerId: string; sale: SaleResponse }) {
  const [open, setOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.post(`/api/sales/${sale.id}/void`, { voidReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", registerId] });
      queryClient.invalidateQueries({ queryKey: ["cash-shift-current", registerId] });
      setVoidReason("");
      setOpen(false);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al anular la venta";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Anular venta">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular venta</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`void-reason-${sale.id}`}>Motivo</Label>
          <Input
            id={`void-reason-${sale.id}`}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={voidReason.trim() === "" || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Anulando..." : "Confirmar anulacion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SalesPage() {
  const [manualBranchId, setManualBranchId] = useState("");
  const [manualRegisterId, setManualRegisterId] = useState("");
  const canViewSales = usePermission("SALE_VIEW_HISTORY");
  const canVoid = usePermission("SALE_VOID");
  const { branches, hasMultiple: hasMultipleBranches, soleBranchId } = useSoleBranch();
  const branchId = hasMultipleBranches ? manualBranchId : soleBranchId;

  const {
    registers,
    isLoading: registersLoading,
    hasMultiple: hasMultipleRegisters,
    soleRegisterId,
  } = useSoleRegister(branchId);
  const registerId = hasMultipleRegisters ? manualRegisterId : soleRegisterId;

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    enabled: canViewSales,
  });
  const { data: customers } = useQuery({
    queryKey: ["customers-all"],
    queryFn: fetchCustomers,
    enabled: canViewSales,
  });
  const { data: sales, isLoading: salesLoading, isError } = useQuery({
    queryKey: ["sales", registerId],
    queryFn: () => fetchSales(registerId),
    enabled: canViewSales && !!registerId,
  });

  const productById = useMemo(
    () => new Map((products ?? []).map((product) => [product.id, product.description])),
    [products]
  );
  const productName = (id: string) => productById.get(id) ?? id;

  const customerById = useMemo(
    () => new Map((customers ?? []).map((customer) => [customer.id, customer.fullName])),
    [customers]
  );
  const customerName = (id: string | null) => (id ? customerById.get(id) ?? id : "Cliente de contado");

  if (!canViewSales) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Historial de ventas</h1>
        <p className="text-sm text-muted-foreground">Tu usuario no tiene permiso para consultar ventas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Historial de ventas</h1>

      {(hasMultipleBranches || hasMultipleRegisters) && (
        <div className="flex flex-col gap-4 sm:flex-row">
          {hasMultipleBranches && (
            <div className="max-w-xs flex-1 space-y-2">
              <label htmlFor="sales-branch" className="text-sm font-medium">
                Sucursal
              </label>
              <select
                id="sales-branch"
                value={manualBranchId}
                onChange={(e) => {
                  setManualBranchId(e.target.value);
                  setManualRegisterId("");
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona una sucursal</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {hasMultipleRegisters && (
            <div className="max-w-xs flex-1 space-y-2">
              <label htmlFor="sales-register" className="text-sm font-medium">
                Caja
              </label>
              <select
                id="sales-register"
                value={manualRegisterId}
                onChange={(e) => setManualRegisterId(e.target.value)}
                disabled={!branchId || registersLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{registersLoading ? "Cargando cajas..." : "Selecciona una caja"}</option>
                {registers.map((register) => (
                  <option key={register.id} value={register.id}>
                    {register.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {branchId && !registersLoading && registers.length === 0 && (
        <p className="text-sm text-muted-foreground">Esta sucursal no tiene cajas activas.</p>
      )}

      {salesLoading && <p className="text-muted-foreground">Cargando ventas...</p>}
      {isError && <p className="text-sm text-destructive">No se pudieron cargar las ventas.</p>}

      {registerId && sales && (
        <Card>
          <CardHeader>
            <CardTitle>Ventas registradas</CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay ventas para esta caja todavia.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2">Fecha</th>
                      <th className="py-2">Cliente</th>
                      <th className="py-2">Estado</th>
                      <th className="py-2">Pago</th>
                      <th className="py-2 text-right">Total</th>
                      <th className="py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id} className="border-b border-border">
                        <td className="py-2">{dateTime(sale.createdAt)}</td>
                        <td className="py-2">{customerName(sale.customerId)}</td>
                        <td className="py-2"><StatusBadge status={sale.status} /></td>
                        <td className="py-2">{paymentLabel(sale)}</td>
                        <td className="py-2 text-right font-medium">{money(sale.total)}</td>
                        <td className="py-2">
                          <div className="flex justify-end gap-1">
                            <SaleDetailDialog
                              sale={sale}
                              productName={productName}
                              customerName={customerName}
                              trigger={
                                <Button variant="ghost" size="icon" aria-label="Ver detalle">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              }
                            />
                            {canVoid && sale.status === "COMPLETED" && (
                              <VoidSaleDialog registerId={registerId} sale={sale} />
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
      )}
    </div>
  );
}
