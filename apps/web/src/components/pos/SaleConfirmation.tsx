"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useInvoicePrinter } from "@/components/invoice/invoice-print-frame";
import { productUnitLabel } from "@/lib/product-units";
import type { ProductResponse } from "@/types/product";
import type { SaleResponse } from "@/types/sale";

interface SaleConfirmationProps {
  sale: SaleResponse;
  products: ProductResponse[];
  registerId: string;
  onNewSale: () => void;
}

export function SaleConfirmation({ sale: initialSale, products, registerId, onNewSale }: Readonly<SaleConfirmationProps>) {
  const canVoid = usePermission("SALE_VOID");
  const [sale, setSale] = useState(initialSale);
  const [open, setOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const queryClient = useQueryClient();
  // La venta recien cerrada se imprime sola; una venta que llega anulada, no.
  const { printInvoice, frame } = useInvoicePrinter(initialSale.status === "COMPLETED" ? initialSale.id : null);

  const voidMutation = useMutation({
    mutationFn: () => api.post<{ data: SaleResponse }>(`/api/sales/${sale.id}/void`, { voidReason }),
    onSuccess: (res) => {
      setSale(res.data.data);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["cash-shift-current", registerId] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al anular la venta";
      toast.error(message);
    },
  });

  const productName = (productId: string) => products.find((p) => p.id === productId)?.description ?? productId;
  const productUnit = (productId: string) => productUnitLabel(products.find((p) => p.id === productId)?.unit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Venta {sale.status === "VOIDED" ? "anulada" : "confirmada"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2">Producto</th>
              <th className="py-2">Cant.</th>
              <th className="py-2">Precio unit.</th>
              <th className="py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="border-b border-border">
                <td className="py-2">{productName(item.productId)}</td>
                <td className="py-2">{item.quantity} {productUnit(item.productId)}</td>
                <td className="py-2">RD${item.unitPrice} / {productUnit(item.productId)}</td>
                <td className="py-2">RD${item.lineTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-1 text-sm">
          <p>Factura: {sale.invoiceNumber}</p>
          {sale.fiscalNcf && <p>NCF: {sale.fiscalNcf}</p>}
          <p>Metodo de pago: {sale.payments.map((p) => p.method).join(", ")}</p>
          <p className="font-semibold">Total: RD${sale.total}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => printInvoice(sale.id)}>
            <Printer className="h-4 w-4" />
            Imprimir factura
          </Button>
          {canVoid && sale.status === "COMPLETED" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Anular</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Anular venta</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="void-reason">Motivo</Label>
                  <Input id="void-reason" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button
                    variant="destructive"
                    disabled={voidReason.trim() === "" || voidMutation.isPending}
                    onClick={() => voidMutation.mutate()}
                  >
                    {voidMutation.isPending ? "Anulando..." : "Confirmar anulacion"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" onClick={onNewSale}>
            Nueva venta
          </Button>
        </div>
        {frame}
      </CardContent>
    </Card>
  );
}
