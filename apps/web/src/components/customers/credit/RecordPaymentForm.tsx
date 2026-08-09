"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/money";
import { dateOnly } from "@/lib/dates";
import type { CreditInvoiceRow, RecordCreditPaymentRequest } from "@/types/credit";

interface RecordPaymentFormProps {
  customerId: string;
  invoices: CreditInvoiceRow[];
  /** Invoice the payment starts against, set by the row the cashier clicked "Abonar" on. */
  initialSaleId?: string;
  initialAmount?: string;
}

/**
 * Takes money against the customer account, either on one invoice or on the balance as a whole.
 *
 * The form starts from whichever invoice the caller pointed at and owns its fields from there.
 * The caller re-keys it to point somewhere else, so a prefill never has to fight what the cashier
 * has already typed.
 */
export function RecordPaymentForm({
  customerId,
  invoices,
  initialSaleId = "",
  initialAmount = "",
}: Readonly<RecordPaymentFormProps>) {
  const [saleId, setSaleId] = useState(initialSaleId);
  const [amount, setAmount] = useState(initialAmount);
  const [note, setNote] = useState("");
  const [payerName, setPayerName] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: RecordCreditPaymentRequest) =>
      api.post(`/api/customers/${customerId}/credit-payments`, values),
    onSuccess: () => {
      for (const key of ["credit-account", "credit-transactions", "credit-invoices"]) {
        queryClient.invalidateQueries({ queryKey: [key, customerId] });
      }
      setAmount("");
      setNote("");
      setSaleId("");
      setPayerName("");
      toast.success("Abono registrado");
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Error al guardar")),
  });

  const selectInvoice = (nextSaleId: string) => {
    setSaleId(nextSaleId);
    const invoice = invoices.find((candidate) => candidate.saleId === nextSaleId);
    if (invoice) setAmount(invoice.outstanding);
  };

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Registrar abono</h3>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({
            amount,
            note: note || undefined,
            saleId: saleId || undefined,
            payerName: payerName || undefined,
          });
        }}
      >
        {invoices.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="payment-invoice">Aplicar a</Label>
            <select
              id="payment-invoice"
              value={saleId}
              onChange={(event) => selectInvoice(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Abono general (balance total)</option>
              {invoices.map((invoice) => (
                <option key={invoice.saleId} value={invoice.saleId}>
                  {dateOnly(invoice.createdAt)} · pendiente {money(invoice.outstanding)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="payment-amount">Monto</Label>
          <Input
            id="payment-amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payer-name">Nombre de quien paga (si no es el cliente)</Label>
          <Input
            id="payer-name"
            placeholder="Opcional, ej. familiar o tercero"
            value={payerName}
            onChange={(event) => setPayerName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment-note">Nota (opcional)</Label>
          <Input id="payment-note" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <Button type="submit" size="sm" disabled={mutation.isPending || !amount}>
          {mutation.isPending ? "Registrando..." : "Registrar abono"}
        </Button>
      </form>
    </section>
  );
}
