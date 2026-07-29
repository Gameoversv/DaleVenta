"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, WalletCards } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/page-header";
import { PermissionDenied } from "@/components/common/permission-denied";
import { ModuleDisabled } from "@/components/common/module-disabled";
import { EmptyState, ErrorState } from "@/components/common/empty-state";
import type { AccountsPayableRow, PurchasePaymentMethod, RecordPurchasePaymentRequest } from "@/types/purchase";
import { money } from "@/lib/money";
import { dateOnly } from "@/lib/dates";

async function fetchPayables(): Promise<AccountsPayableRow[]> {
  const res = await api.get<{ data: AccountsPayableRow[] }>("/api/purchases/accounts-payable");
  return res.data.data;
}



function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function PaymentDialog({ row }: { row: AccountsPayableRow }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(row.balanceDue);
  const [method, setMethod] = useState<PurchasePaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: RecordPurchasePaymentRequest) => api.post(`/api/purchases/${row.purchaseId}/payments`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      setOpen(false);
      toast.success("Pago registrado");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo registrar el pago";
      toast.error(message);
    },
  });
  const balance = Number(row.balanceDue);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setAmount(row.balanceDue);
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
            <p className="font-medium">{row.purchaseNumber} - {row.supplierName}</p>
            <p className="text-muted-foreground">Pendiente: <span className="font-mono-money">{money(row.balanceDue)}</span></p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`payable-payment-amount-${row.purchaseId}`}>Monto</Label>
              <Input
                id={`payable-payment-amount-${row.purchaseId}`}
                type="number"
                min="0.01"
                max={row.balanceDue}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`payable-payment-method-${row.purchaseId}`}>Metodo</Label>
              <select
                id={`payable-payment-method-${row.purchaseId}`}
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
            <Label htmlFor={`payable-payment-reference-${row.purchaseId}`}>Referencia</Label>
            <Input id={`payable-payment-reference-${row.purchaseId}`} value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`payable-payment-notes-${row.purchaseId}`}>Notas</Label>
            <Input id={`payable-payment-notes-${row.purchaseId}`} value={notes} onChange={(e) => setNotes(e.target.value)} />
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

export default function AccountsPayablePage() {
  const canView = usePermission("PURCHASE_PAYABLE_VIEW");
  const canPay = usePermission("PURCHASE_PAYMENT_RECORD");
  const tenantFeatures = useTenantFeatures();
  const enabled = tenantFeatures.purchaseModuleEnabled;
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["accounts-payable"],
    queryFn: fetchPayables,
    enabled: enabled && canView,
  });

  const totalOutstanding = useMemo(
    () => (rows ?? []).reduce((sum, row) => sum + Number(row.balanceDue), 0),
    [rows]
  );

  if (!enabled) {
    return <ModuleDisabled title="Cuentas por pagar" />;
  }

  if (!canView) {
    return <PermissionDenied title="Cuentas por pagar" message="No tienes permiso para ver cuentas por pagar." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Cuentas por pagar" />

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <CircleDollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="font-mono-money text-3xl font-extrabold text-warning">{money(totalOutstanding)}</p>
            <p className="text-sm text-muted-foreground">
              {rows?.length ?? 0} compra{rows?.length === 1 ? "" : "s"} con balance pendiente
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Cargando...</p>}
          {isError && <ErrorState message="No se pudo cargar la lista." className="p-6" />}
          {rows && rows.length === 0 && <EmptyState message="No hay compras con balance pendiente." className="p-6" />}
          {rows && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3">Compra</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Factura proveedor</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Pagado</th>
                    <th className="px-4 py-3 text-right">Pendiente</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.purchaseId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{row.purchaseNumber}</td>
                      <td className="px-4 py-3">{row.supplierName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{dateOnly(row.purchasedAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.invoiceNumber ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-mono-money">{money(row.total)}</td>
                      <td className="px-4 py-3 text-right font-mono-money text-muted-foreground">{money(row.paidAmount)}</td>
                      <td className="px-4 py-3 text-right font-mono-money font-semibold text-warning">{money(row.balanceDue)}</td>
                      <td className="px-4 py-3 text-right">
                        {canPay && Number(row.balanceDue) > 0 && <PaymentDialog row={row} />}
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
