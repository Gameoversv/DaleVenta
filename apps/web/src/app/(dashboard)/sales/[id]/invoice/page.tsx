"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { PaymentMethodBadge } from "@/components/ui/payment-method-badge";
import { cn } from "@/lib/utils";
import type { InvoiceResponse } from "@/types/sale";

async function fetchInvoice(id: string): Promise<InvoiceResponse> {
  const res = await api.get<{ data: InvoiceResponse }>(`/api/sales/${id}/invoice`);
  return res.data.data;
}

function money(value: string | number): string {
  const amount = Number(value ?? 0);
  return `RD$${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
}

function dateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function fieldValue(record: unknown, names: string[], fallback: string | number = 0): string | number {
  const source = record as Record<string, unknown> | null | undefined;
  for (const name of names) {
    const value = source?.[name];
    if (value !== undefined && value !== null && value !== "") {
      return value as string | number;
    }
  }
  return fallback;
}

function itemName(item: unknown, index: number): string {
  const value = fieldValue(item, ["productName", "description", "name", "productId"], `Producto ${index + 1}`);
  return String(value);
}

function invoiceWidth(printSize: InvoiceResponse["business"]["printSize"]): string {
  if (printSize === "THERMAL_58MM") return "max-w-[58mm]";
  if (printSize === "THERMAL_80MM") return "max-w-[80mm]";
  return "max-w-3xl";
}

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const canView = usePermission("SALE_VIEW_HISTORY") || usePermission("SALE_CREATE");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoice", params.id],
    queryFn: () => fetchInvoice(params.id),
    enabled: canView && !!params.id,
  });

  if (!canView) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Factura</h1>
        <p className="text-sm text-muted-foreground">Tu usuario no tiene permiso para ver facturas.</p>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto space-y-4 print:space-y-0", data ? invoiceWidth(data.business.printSize) : "max-w-3xl")}>
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="outline">
          <Link href="/sales">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
        <Button onClick={() => window.print()} disabled={!data}>
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground print:hidden">Cargando factura...</p>}
      {isError && <p className="text-sm text-destructive print:hidden">No se pudo cargar la factura.</p>}

      {data && (
        <section className="bg-background p-6 text-foreground shadow-sm ring-1 ring-border print:p-0 print:shadow-none print:ring-0">
          <div className="border-b border-border pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                {data.business.showLogo && data.business.logoUrl && (
                  <img src={data.business.logoUrl} alt={data.business.name} className="mb-3 max-h-16 max-w-40 object-contain" />
                )}
                <h1 className="text-2xl font-bold">{data.business.name}</h1>
                {data.business.showRnc && data.business.rnc && <p className="text-sm">RNC: {data.business.rnc}</p>}
                {data.business.showAddress && (
                  <p className="text-sm text-muted-foreground">
                    {[data.business.address, data.business.city].filter(Boolean).join(", ")}
                  </p>
                )}
                {(data.business.showPhone || data.business.showEmail) && (
                  <p className="text-sm text-muted-foreground">
                    {[
                      data.business.showPhone ? data.business.phone : null,
                      data.business.showEmail ? data.business.email : null,
                    ].filter(Boolean).join(" | ")}
                  </p>
                )}
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs uppercase text-muted-foreground">Factura</p>
                <p className="text-2xl font-bold">{data.invoiceNumber}</p>
                <p className="text-sm">{dateTime(data.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-b border-border py-4 text-sm sm:grid-cols-2">
            {data.business.showCustomer && (
              <div>
                <p className="font-medium">Cliente</p>
                <p>{data.customer?.name ?? "Cliente de contado"}</p>
                {data.customer?.documentId && <p className="text-muted-foreground">Documento: {data.customer.documentId}</p>}
                {data.customer?.phone && <p className="text-muted-foreground">Telefono: {data.customer.phone}</p>}
              </div>
            )}
            <div className="sm:text-right">
              <p className="font-medium">Venta</p>
              <p className="text-muted-foreground">Estado: {data.status === "COMPLETED" ? "Completada" : "Anulada"}</p>
            </div>
          </div>

          <div className="py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2">Producto</th>
                  <th className="py-2 text-right">Cant.</th>
                  <th className="py-2 text-right">Precio</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={`${itemName(item, index)}-${index}`} className="border-b border-border">
                    <td className="py-2">{itemName(item, index)}</td>
                    <td className="py-2 text-right">{fieldValue(item, ["quantity", "qty"], 0)}</td>
                    <td className="py-2 text-right">{money(fieldValue(item, ["unitPrice", "price"]))}</td>
                    <td className="py-2 text-right">{money(fieldValue(item, ["lineTotal", "total", "amount"]))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-[1fr_240px]">
            <div className="space-y-2 text-sm">
              <p className="font-medium">Pagos</p>
              {data.payments.map((payment) => (
                <div key={payment.id} className="flex max-w-xs items-center justify-between gap-3">
                  <PaymentMethodBadge method={payment.method} />
                  <span className="font-mono-money">{money(payment.amount)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(data.subtotal)}</span></div>
              {data.business.showTax && <div className="flex justify-between"><span>Impuesto</span><span>{money(data.taxTotal)}</span></div>}
              <div className="flex justify-between"><span>Descuento</span><span>{money(data.discountAmount)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
                <span>Total</span><span>{money(data.total)}</span>
              </div>
            </div>
          </div>
          {data.business.footerMessage && (
            <p className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
              {data.business.footerMessage}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
