"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import api from "@/lib/api";
import type { CustomerResponse } from "@/types/customer";
import type { ProductResponse } from "@/types/product";
import type { SaleResponse } from "@/types/sale";
import { money } from "@/lib/money";
import { dateTime } from "@/lib/dates";

async function fetchSalesByCustomer(customerId: string): Promise<SaleResponse[]> {
  const res = await api.get<{ data: SaleResponse[] }>("/api/sales", { params: { customerId } });
  return res.data.data;
}

async function fetchProducts(): Promise<ProductResponse[]> {
  const res = await api.get<{ data: ProductResponse[] }>("/api/products");
  return res.data.data;
}



function paymentLabel(sale: SaleResponse): string {
  return sale.payments.map((p) => p.method).join(", ");
}

interface CustomerPurchaseHistoryDialogProps {
  customer: CustomerResponse;
  trigger: React.ReactNode;
}

export function CustomerPurchaseHistoryDialog({ customer, trigger }: CustomerPurchaseHistoryDialogProps) {
  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales-by-customer", customer.id],
    queryFn: () => fetchSalesByCustomer(customer.id),
  });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const productById = useMemo(
    () => new Map((products ?? []).map((product) => [product.id, product.description])),
    [products]
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial de compras de {customer.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {isLoading && <p className="text-muted-foreground">Cargando compras...</p>}
          {sales && sales.length === 0 && <p className="text-muted-foreground">Este cliente no tiene compras registradas.</p>}
          {sales && sales.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Pago</th>
                  <th className="py-2">Items</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-border align-top">
                    <td className="py-2">{dateTime(sale.createdAt)}</td>
                    <td className="py-2">{sale.status === "COMPLETED" ? "Completada" : "Anulada"}</td>
                    <td className="py-2">{paymentLabel(sale)}</td>
                    <td className="py-2">
                      {sale.items.map((item) => (
                        <div key={item.id}>
                          {item.quantity}x {productById.get(item.productId) ?? item.productId}
                        </div>
                      ))}
                    </td>
                    <td className="py-2 text-right font-medium">{money(sale.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
