import { Button } from "@/components/ui/button";
import { money } from "@/lib/money";
import { dateOnly } from "@/lib/dates";
import type { CreditInvoiceRow } from "@/types/credit";

interface OutstandingInvoicesTableProps {
  invoices: CreditInvoiceRow[];
  /** Whether the viewer may take money, which is the only reason the last column exists. */
  canReceivePayment: boolean;
  onPayInvoice: (invoice: CreditInvoiceRow) => void;
}

/** The invoices this customer still owes something on, newest first as the API returns them. */
export function OutstandingInvoicesTable({
  invoices,
  canReceivePayment,
  onPayInvoice,
}: Readonly<OutstandingInvoicesTableProps>) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Facturas pendientes</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-1">Fecha</th>
            <th className="py-1 text-right">Cargo</th>
            <th className="py-1 text-right">Abonado</th>
            <th className="py-1 text-right">Pendiente</th>
            {canReceivePayment && <th className="py-1"></th>}
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.saleId} className="border-b border-border">
              <td className="py-1">{dateOnly(invoice.createdAt)}</td>
              <td className="py-1 text-right font-mono-money">{money(invoice.chargeAmount)}</td>
              <td className="py-1 text-right font-mono-money">{money(invoice.paidAmount)}</td>
              <td className="py-1 text-right font-mono-money font-semibold text-warning">
                {money(invoice.outstanding)}
              </td>
              {canReceivePayment && (
                <td className="py-1 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onPayInvoice(invoice)}>
                    Abonar
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
