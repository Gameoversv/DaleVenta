"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DenominationCountGrid, formatDenominationValue } from "@/components/cash-shift/DenominationCountGrid";
import type { DenominationCountEntry, DenominationResponse } from "@/types/cash-shift";
import type { ChangeSuggestionResponse, PaymentRequest } from "@/types/sale";
import type { CustomerResponse } from "@/types/customer";
import type { CreditAccountResponse, CreditProfileResponse } from "@/types/credit";

async function fetchDenominations(): Promise<DenominationResponse[]> {
  const res = await api.get<{ data: DenominationResponse[] }>("/api/denominations");
  return res.data.data;
}

async function fetchChangeSuggestion(
  registerId: string,
  changeAmountCents: number,
  receivedDenominations: DenominationCountEntry[]
): Promise<ChangeSuggestionResponse> {
  const res = await api.post<{ data: ChangeSuggestionResponse }>("/api/cash-shifts/change-suggestion", {
    registerId,
    changeAmountCents,
    receivedDenominations,
  });
  return res.data.data;
}

type PaymentMethodTab = "CASH" | "TRANSFER" | "CREDIT";

async function fetchCreditProfile(customerId: string): Promise<CreditProfileResponse> {
  const res = await api.get<{ data: CreditProfileResponse }>(`/api/customers/${customerId}/credit-profile`);
  return res.data.data;
}

async function fetchCreditAccount(customerId: string): Promise<CreditAccountResponse> {
  const res = await api.get<{ data: CreditAccountResponse }>(`/api/customers/${customerId}/credit-account`);
  return res.data.data;
}

interface CheckoutPanelProps {
  registerId: string;
  customer: CustomerResponse | null;
  preDiscountTotal: number;
  disabled: boolean;
  isSubmitting: boolean;
  onConfirm: (payment: PaymentRequest, discountAmount: number) => void;
}

export function CheckoutPanel({ registerId, customer, preDiscountTotal, disabled, isSubmitting, onConfirm }: CheckoutPanelProps) {
  const canDiscount = usePermission("SALE_DISCOUNT");
  const [discountInput, setDiscountInput] = useState("");
  const [method, setMethod] = useState<PaymentMethodTab>("CASH");
  const [receivedEntries, setReceivedEntries] = useState<DenominationCountEntry[]>([]);
  const [bank, setBank] = useState("");
  const [reference, setReference] = useState("");

  const { data: denominations } = useQuery({ queryKey: ["denominations"], queryFn: fetchDenominations });

  const discountAmount = canDiscount ? Math.max(0, parseFloat(discountInput) || 0) : 0;
  const total = Math.max(0, preDiscountTotal - discountAmount);

  const receivedTotal = receivedEntries.reduce((sum, e) => {
    const denom = denominations?.find((d) => d.id === e.denominationId);
    return sum + (denom ? Number(denom.value) * e.quantity : 0);
  }, 0);
  const changeAmountCents = Math.round((receivedTotal - total) * 100);

  const { data: suggestion } = useQuery({
    queryKey: ["change-suggestion", registerId, changeAmountCents, receivedEntries],
    queryFn: () => fetchChangeSuggestion(registerId, changeAmountCents, receivedEntries),
    enabled: method === "CASH" && changeAmountCents >= 0 && receivedEntries.length > 0 && total > 0,
  });

  const { data: creditProfile } = useQuery({
    queryKey: ["credit-profile", customer?.id],
    queryFn: () => fetchCreditProfile(customer!.id),
    enabled: method === "CREDIT" && !!customer,
  });

  const { data: creditAccount } = useQuery({
    queryKey: ["credit-account", customer?.id],
    queryFn: () => fetchCreditAccount(customer!.id),
    enabled: method === "CREDIT" && !!customer,
  });

  const creditAvailable =
    creditProfile && creditAccount ? Number(creditProfile.creditLimit) - Number(creditAccount.balance) : null;
  const creditEligible = !!customer && creditProfile?.creditEnabled === true;
  const creditWithinLimit = creditAvailable !== null && total <= creditAvailable;

  const cashReady = method === "CASH" && changeAmountCents >= 0 && receivedEntries.length > 0 && suggestion?.exact === true;
  const transferReady = method === "TRANSFER" && bank.trim() !== "" && reference.trim() !== "";
  const creditReady = method === "CREDIT" && creditEligible && creditWithinLimit;
  const canConfirm = !disabled && total > 0 && (cashReady || transferReady || creditReady) && !isSubmitting;

  const handleConfirm = () => {
    const payment: PaymentRequest =
      method === "CASH"
        ? { method: "CASH", amount: total.toFixed(2), receivedDenominations: receivedEntries }
        : method === "TRANSFER"
          ? { method: "TRANSFER", amount: total.toFixed(2), bank, reference }
          : { method: "CREDIT", amount: total.toFixed(2) };
    onConfirm(payment, discountAmount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cobro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canDiscount && (
          <div className="space-y-2">
            <Label htmlFor="sale-discount">Descuento</Label>
            <Input
              id="sale-discount"
              type="number"
              min={0}
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
            />
          </div>
        )}
        <p className="text-sm font-medium">Total a cobrar: RD${total.toFixed(2)}</p>
        <div className="flex gap-2">
          <Button type="button" variant={method === "CASH" ? "default" : "outline"} size="sm" onClick={() => setMethod("CASH")}>
            Efectivo
          </Button>
          <Button
            type="button"
            variant={method === "TRANSFER" ? "default" : "outline"}
            size="sm"
            onClick={() => setMethod("TRANSFER")}
          >
            Transferencia
          </Button>
          <Button
            type="button"
            variant={method === "CREDIT" ? "default" : "outline"}
            size="sm"
            disabled={!customer}
            title={!customer ? "Selecciona un cliente para vender a credito" : undefined}
            onClick={() => setMethod("CREDIT")}
          >
            Credito
          </Button>
        </div>
        {method === "CASH" ? (
          <div className="space-y-3">
            <DenominationCountGrid onChange={setReceivedEntries} />
            {receivedEntries.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Recibido: RD${receivedTotal.toFixed(2)}
                {changeAmountCents >= 0 && ` · Cambio: RD${(changeAmountCents / 100).toFixed(2)}`}
              </p>
            )}
            {changeAmountCents < 0 && receivedEntries.length > 0 && (
              <p className="text-sm text-destructive">Recibido insuficiente para cubrir el total.</p>
            )}
            {changeAmountCents >= 0 && receivedEntries.length > 0 && suggestion && !suggestion.exact && (
              <p className="text-sm text-destructive">No hay combinacion exacta de cambio disponible.</p>
            )}
            {suggestion?.exact && suggestion.combination.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Cambio en:{" "}
                {suggestion.combination
                  .map((c) => {
                    const d = denominations?.find((den) => den.id === c.denominationId);
                    return `${c.quantity} x ${d ? formatDenominationValue(d.value) : c.denominationId}`;
                  })
                  .join(", ")}
              </p>
            )}
          </div>
        ) : method === "TRANSFER" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="transfer-bank">Banco</Label>
              <Input id="transfer-bank" value={bank} onChange={(e) => setBank(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-reference">Referencia</Label>
              <Input id="transfer-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {!customer && <p className="text-sm text-destructive">Selecciona un cliente para vender a credito.</p>}
            {customer && creditProfile && !creditProfile.creditEnabled && (
              <p className="text-sm text-destructive">Este cliente no tiene credito habilitado.</p>
            )}
            {customer && creditEligible && creditAccount && creditProfile && (
              <>
                <p className="text-sm">
                  Balance actual: RD${creditAccount.balance} · Limite: RD${creditProfile.creditLimit}
                </p>
                <p className="text-sm font-medium">Disponible: RD${creditAvailable?.toFixed(2)}</p>
                {!creditWithinLimit && (
                  <p className="text-sm text-destructive">Excede el credito disponible.</p>
                )}
              </>
            )}
          </div>
        )}
        <Button disabled={!canConfirm} onClick={handleConfirm}>
          {isSubmitting ? "Cobrando..." : "Cobrar"}
        </Button>
      </CardContent>
    </Card>
  );
}
