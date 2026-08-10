"use client";

import { PaymentMethodBadge } from "@/components/ui/payment-method-badge";
import { productUnitLabel } from "@/lib/product-units";
import { moneyOrZero } from "@/lib/money";
import { dateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { InvoiceResponse } from "@/types/sale";

/**
 * Rejilla de una linea de venta, compartida por la cabecera y cada item.
 *
 * En tirilla son dos filas (nombre completo arriba; cantidad, precio y total
 * abajo). A partir de @lg el papel da para las cuatro columnas de siempre.
 */
const ITEM_GRID =
  "grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 @lg:grid-cols-[1fr_5rem_8rem_8rem] @lg:gap-x-3";

/**
 * El documento imprimible de la factura, sin cabecera ni botones.
 *
 * Vive aparte de la pantalla de venta porque Configuracion lo reusa con una
 * venta de ejemplo: asi el preview y la factura real no pueden divergir.
 */

// El API historicamente devolvio estos campos en camelCase y snake_case.
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
  const value = fieldValue(
    item,
    ["productName", "product_name", "description", "name", "productId", "product_id"],
    `Producto ${index + 1}`
  );
  return String(value);
}

function rentalStatusLabel(status: string): string {
  if (status === "RESERVED") return "Reservado";
  if (status === "ACTIVE") return "Alquilado";
  if (status === "RETURNED") return "Recibido";
  return "Anulado";
}

function paymentTotal(data: InvoiceResponse): number {
  return data.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
}

/** Ancho real del papel: una tira termica no se dibuja del ancho de la pantalla. */
export function invoiceWidth(printSize: InvoiceResponse["business"]["printSize"]): string {
  if (printSize === "THERMAL_58MM") return "max-w-[58mm]";
  if (printSize === "THERMAL_80MM") return "max-w-[80mm]";
  return "max-w-3xl";
}

export function InvoiceDocument({ data }: Readonly<{ data: InvoiceResponse }>) {
  return (
    // @container: el papel manda, no la pantalla. En una tirilla de 58mm los
    // breakpoints de viewport abrian dos columnas dentro de 219px y los totales
    // se salian del papel; los variantes @lg miden el ancho de esta seccion.
    <section className="@container bg-white p-3 text-slate-950 shadow-sm ring-1 ring-slate-200 @lg:p-6 print:p-0 print:text-black print:shadow-none print:ring-0 [&_.border-border]:border-slate-200 [&_.text-muted-foreground]:text-slate-500">
      <div className="border-b border-border pb-4">
        <div className="flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between">
          <div className="text-center @lg:text-left">
            {data.business.showLogo && data.business.logoUrl && (
              // Tenant logos are dynamic storage URLs and this printable document needs the original asset.
              // next/image would require a host allowlist that cannot cover each tenant storage provider.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.business.logoUrl}
                alt={data.business.name}
                className="mx-auto mb-3 max-h-16 max-w-40 object-contain @lg:mx-0"
              />
            )}
            <h1 className="text-lg font-bold break-words @lg:text-2xl">{data.business.name}</h1>
            {data.business.showRnc && data.business.rnc && <p className="text-xs @lg:text-sm">RNC: {data.business.rnc}</p>}
            {data.business.showAddress && (
              <p className="text-xs text-muted-foreground @lg:text-sm">
                {[data.business.address, data.business.city].filter(Boolean).join(", ")}
              </p>
            )}
            {(data.business.showPhone || data.business.showEmail) && (
              <p className="text-xs text-muted-foreground @lg:text-sm">
                {[
                  data.business.showPhone ? data.business.phone : null,
                  data.business.showEmail ? data.business.email : null,
                ].filter(Boolean).join(" | ")}
              </p>
            )}
          </div>
          <div className="text-center @lg:text-right">
            <p className="text-xs uppercase text-muted-foreground">Factura</p>
            <p className="text-lg font-bold break-words @lg:text-2xl">{data.invoiceNumber}</p>
            {data.fiscalNcf && (
              <div className="mt-2">
                <p className="text-xs uppercase text-muted-foreground">NCF</p>
                <p className="text-base font-semibold break-words @lg:text-lg">{data.fiscalNcf}</p>
                {data.fiscalReceiptType && <p className="text-xs text-muted-foreground">{data.fiscalReceiptType}</p>}
              </div>
            )}
            <p className="text-xs @lg:text-sm">{dateTime(data.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 border-b border-border py-4 text-xs @lg:grid-cols-2 @lg:gap-4 @lg:text-sm">
        {data.business.showCustomer && (
          <div>
            <p className="font-medium">Cliente</p>
            <p>{data.customer?.name ?? "Cliente de contado"}</p>
            {data.customer?.documentId && <p className="text-muted-foreground">Documento: {data.customer.documentId}</p>}
            {data.customer?.phone && <p className="text-muted-foreground">Telefono: {data.customer.phone}</p>}
          </div>
        )}
        <div className="@lg:text-right">
          <p className="font-medium">Venta</p>
          <p className="text-muted-foreground">Estado: {data.status === "COMPLETED" ? "Completada" : "Anulada"}</p>
        </div>
      </div>

      {/* Lista, no <table>: en tirilla cada linea se reacomoda a dos filas
          (nombre arriba, cantidad x precio y total abajo) y una tabla no puede. */}
      <div className="py-4">
        <div className={cn(ITEM_GRID, "hidden border-b border-border pb-2 text-xs text-muted-foreground @lg:grid")}>
          <span>Producto</span>
          <span className="text-right">Cant.</span>
          <span className="text-right">Precio</span>
          <span className="text-right">Total</span>
        </div>
        <ul>
          {data.items.map((item, index) => {
            const unit = productUnitLabel(String(fieldValue(item, ["productUnit", "product_unit"], item.productUnit)));
            return (
              <li
                key={`${itemName(item, index)}-${index}`}
                className={cn(ITEM_GRID, "border-b border-border py-1.5 text-xs @lg:py-2 @lg:text-sm")}
              >
                <span className="col-span-3 font-medium @lg:col-span-1 @lg:font-normal">{itemName(item, index)}</span>
                <span className="text-slate-500 @lg:text-right @lg:text-slate-950">
                  {fieldValue(item, ["quantity", "qty"], 0)} {unit}
                </span>
                <span className="text-slate-500 @lg:text-right @lg:text-slate-950">
                  <span className="@lg:hidden">&times; </span>
                  {moneyOrZero(fieldValue(item, ["unitPrice", "unit_price", "price"]))}
                  <span className="hidden @lg:inline"> / {unit}</span>
                </span>
                <span className="text-right font-medium @lg:font-normal">
                  {moneyOrZero(fieldValue(item, ["lineTotal", "line_total", "total", "amount"]))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {data.rental && (
        <div className="border-t border-border py-4 text-xs @lg:text-sm">
          <p className="font-medium">Contrato de alquiler</p>
          <div className="mt-2 grid gap-2 @lg:grid-cols-2">
            <p className="text-muted-foreground">
              Contrato: <span className="font-medium text-foreground">{data.rental.contractNumber}</span>
            </p>
            <p className="text-muted-foreground">
              Estado: <span className="font-medium text-foreground">{rentalStatusLabel(data.rental.status)}</span>
            </p>
            <p className="text-muted-foreground">
              Devolucion esperada: <span className="font-medium text-foreground">{dateTime(data.rental.expectedReturnAt)}</span>
            </p>
            {data.rental.returnedAt && (
              <p className="text-muted-foreground">
                Recibido: <span className="font-medium text-foreground">{dateTime(data.rental.returnedAt)}</span>
              </p>
            )}
          </div>
          {data.rental.notes && <p className="mt-2 text-muted-foreground">Notas: {data.rental.notes}</p>}
        </div>
      )}

      <div className="grid gap-4 border-t border-border pt-4 @lg:grid-cols-[1fr_15rem]">
        <div className="space-y-2 text-xs @lg:text-sm">
          <p className="font-medium">Pagos</p>
          {data.payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between gap-3 @lg:max-w-xs">
              <PaymentMethodBadge method={payment.method} />
              <span className="font-mono-money">{moneyOrZero(payment.amount)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2 text-xs @lg:text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{moneyOrZero(data.subtotal)}</span></div>
          {data.business.showTax && <div className="flex justify-between"><span>Impuesto</span><span>{moneyOrZero(data.taxTotal)}</span></div>}
          <div className="flex justify-between"><span>Descuento</span><span>{moneyOrZero(data.discountAmount)}</span></div>
          {data.rental && Number(data.rental.depositAmount) > 0 && (
            <div className="flex justify-between">
              <span>Deposito alquiler</span><span>{moneyOrZero(data.rental.depositAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold @lg:text-lg">
            <span>{data.rental ? "Total renta" : "Total"}</span><span>{moneyOrZero(data.total)}</span>
          </div>
          {data.rental && (
            <div className="flex justify-between text-base font-bold @lg:text-lg">
              <span>Total cobrado</span><span>{moneyOrZero(data.amountPaid ?? paymentTotal(data))}</span>
            </div>
          )}
        </div>
      </div>
      {data.business.footerMessage && (
        <p className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground @lg:text-sm">
          {data.business.footerMessage}
        </p>
      )}
    </section>
  );
}
