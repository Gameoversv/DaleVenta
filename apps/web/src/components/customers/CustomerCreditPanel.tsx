"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";
import type { CustomerResponse } from "@/types/customer";
import type {
  CreditAccountResponse,
  CreditInvoiceRow,
  CreditProfileResponse,
  CreditTransactionResponse,
  UpdateCreditProfileRequest,
  RecordCreditPaymentRequest,
} from "@/types/credit";

function extractError(err: unknown): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al guardar";
}

async function fetchProfile(customerId: string): Promise<CreditProfileResponse> {
  const res = await api.get<{ data: CreditProfileResponse }>(`/api/customers/${customerId}/credit-profile`);
  return res.data.data;
}

async function fetchAccount(customerId: string): Promise<CreditAccountResponse> {
  const res = await api.get<{ data: CreditAccountResponse }>(`/api/customers/${customerId}/credit-account`);
  return res.data.data;
}

async function fetchTransactions(customerId: string): Promise<CreditTransactionResponse[]> {
  const res = await api.get<{ data: CreditTransactionResponse[] }>(`/api/customers/${customerId}/credit-transactions`);
  return res.data.data;
}

async function fetchInvoices(customerId: string): Promise<CreditInvoiceRow[]> {
  const res = await api.get<{ data: CreditInvoiceRow[] }>(`/api/customers/${customerId}/credit-invoices`);
  return res.data.data;
}

function money(value: string): string {
  return `RD$${Number(value).toFixed(2)}`;
}

function dateOnly(value: string): string {
  return new Date(value).toLocaleDateString();
}

interface CustomerCreditPanelProps {
  customer: CustomerResponse;
  trigger: React.ReactNode;
}

export function CustomerCreditPanel({ customer, trigger }: CustomerCreditPanelProps) {
  const [open, setOpen] = useState(false);
  const canAuthorize = usePermission("CREDIT_AUTHORIZE");
  const canViewCredit = usePermission("CUSTOMER_EDIT");
  const canReceivePayment = usePermission("CREDIT_RECEIVE_PAYMENT");
  const queryClient = useQueryClient();

  const [creditEnabled, setCreditEnabled] = useState(false);
  const [creditLimit, setCreditLimit] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentSaleId, setPaymentSaleId] = useState("");
  const [payerName, setPayerName] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["credit-profile", customer.id],
    queryFn: () => fetchProfile(customer.id),
    enabled: open && canViewCredit,
  });

  const { data: account } = useQuery({
    queryKey: ["credit-account", customer.id],
    queryFn: () => fetchAccount(customer.id),
    enabled: open && canViewCredit,
  });

  const { data: transactions } = useQuery({
    queryKey: ["credit-transactions", customer.id],
    queryFn: () => fetchTransactions(customer.id),
    enabled: open && canViewCredit,
  });

  const { data: invoices } = useQuery({
    queryKey: ["credit-invoices", customer.id],
    queryFn: () => fetchInvoices(customer.id),
    enabled: open && canViewCredit,
  });

  const profileMutation = useMutation({
    mutationFn: (values: UpdateCreditProfileRequest) =>
      api.put(`/api/customers/${customer.id}/credit-profile`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-profile", customer.id] });
      toast.success("Perfil de credito actualizado");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  const paymentMutation = useMutation({
    mutationFn: (values: RecordCreditPaymentRequest) =>
      api.post(`/api/customers/${customer.id}/credit-payments`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-account", customer.id] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions", customer.id] });
      queryClient.invalidateQueries({ queryKey: ["credit-invoices", customer.id] });
      setPaymentAmount("");
      setPaymentNote("");
      setPaymentSaleId("");
      setPayerName("");
      toast.success("Abono registrado");
    },
    onError: (err: unknown) => toast.error(extractError(err)),
  });

  useEffect(() => {
    if (profile) {
      setCreditEnabled(profile.creditEnabled);
      setCreditLimit(profile.creditLimit);
    }
  }, [profile]);

  const available = account && profile ? (Number(profile.creditLimit) - Number(account.balance)).toFixed(2) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Credito de {customer.fullName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Perfil</h3>
            {canAuthorize ? (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  profileMutation.mutate({ creditEnabled, creditLimit });
                }}
              >
                <div className="flex items-center gap-2">
                  <input
                    id="credit-enabled"
                    type="checkbox"
                    checked={creditEnabled}
                    onChange={(e) => setCreditEnabled(e.target.checked)}
                  />
                  <Label htmlFor="credit-enabled">Credito habilitado</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credit-limit">Limite de credito</Label>
                  <Input id="credit-limit" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
                </div>
                <Button type="submit" size="sm" disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? "Guardando..." : "Guardar perfil"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                {profile?.creditEnabled ? `Habilitado, limite RD$${profile.creditLimit}` : "Credito no habilitado"}
              </p>
            )}
          </section>

          {canViewCredit && (
            <section className="space-y-1">
              <h3 className="text-sm font-semibold">Balance</h3>
              <p className="text-sm">
                Balance actual: <span className="font-medium">RD${account?.balance ?? "0.00"}</span>
                {available !== null && ` · Disponible: RD$${available}`}
              </p>
            </section>
          )}

          {canViewCredit && invoices && invoices.length > 0 && (
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
                  {invoices.map((inv) => (
                    <tr key={inv.saleId} className="border-b border-border">
                      <td className="py-1">{dateOnly(inv.createdAt)}</td>
                      <td className="py-1 text-right">{money(inv.chargeAmount)}</td>
                      <td className="py-1 text-right">{money(inv.paidAmount)}</td>
                      <td className="py-1 text-right font-medium">{money(inv.outstanding)}</td>
                      {canReceivePayment && (
                        <td className="py-1 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPaymentSaleId(inv.saleId);
                              setPaymentAmount(inv.outstanding);
                            }}
                          >
                            Abonar
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {canReceivePayment && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Registrar abono</h3>
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  paymentMutation.mutate({
                    amount: paymentAmount,
                    note: paymentNote || undefined,
                    saleId: paymentSaleId || undefined,
                    payerName: payerName || undefined,
                  });
                }}
              >
                {invoices && invoices.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="payment-invoice">Aplicar a</Label>
                    <select
                      id="payment-invoice"
                      value={paymentSaleId}
                      onChange={(e) => {
                        setPaymentSaleId(e.target.value);
                        const inv = invoices.find((i) => i.saleId === e.target.value);
                        if (inv) setPaymentAmount(inv.outstanding);
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Abono general (balance total)</option>
                      {invoices.map((inv) => (
                        <option key={inv.saleId} value={inv.saleId}>
                          {dateOnly(inv.createdAt)} · pendiente {money(inv.outstanding)}
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
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payer-name">Nombre de quien paga (si no es el cliente)</Label>
                  <Input
                    id="payer-name"
                    placeholder="Opcional, ej. familiar o tercero"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-note">Nota (opcional)</Label>
                  <Input id="payment-note" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
                </div>
                <Button type="submit" size="sm" disabled={paymentMutation.isPending || !paymentAmount}>
                  {paymentMutation.isPending ? "Registrando..." : "Registrar abono"}
                </Button>
              </form>
            </section>
          )}

          {canViewCredit && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Historial</h3>
              {transactions && transactions.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin transacciones todavia.</p>
              )}
              {transactions && transactions.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1">Tipo</th>
                      <th className="py-1">Monto</th>
                      <th className="py-1">Pagado por</th>
                      <th className="py-1">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id} className="border-b border-border">
                        <td className={`py-1 ${t.type === "CHARGE" ? "text-destructive" : "text-green-600"}`}>
                          {t.type === "CHARGE" ? "Cargo" : "Abono"}
                        </td>
                        <td className="py-1">RD${t.amount}</td>
                        <td className="py-1">{t.payerName ?? "—"}</td>
                        <td className="py-1">{t.note ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
