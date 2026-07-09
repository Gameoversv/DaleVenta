"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Landmark, Split, Wallet2 } from "lucide-react";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DenominationCountGrid, formatDenominationValue } from "@/components/cash-shift/DenominationCountGrid";
import type { DenominationCountEntry, DenominationResponse } from "@/types/cash-shift";
import type { ChangeSuggestionResponse, PaymentRequest, RentalDetailsRequest } from "@/types/sale";
import type { CustomerResponse } from "@/types/customer";
import type { CreditAccountResponse, CreditProfileResponse } from "@/types/credit";
import type { FiscalReceiptSequence, FiscalReceiptType } from "@/types/fiscal";

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

type PaymentMethodTab = "CASH" | "TRANSFER" | "MIXED" | "CREDIT";

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
  fiscalModuleEnabled: boolean;
  fiscalSequences: FiscalReceiptSequence[];
  cashDenominationsEnabled: boolean;
  hasRentalItems: boolean;
  onConfirm: (
    payments: PaymentRequest[],
    discountAmount: number,
    fiscalReceiptType?: FiscalReceiptType | null,
    rentalDetails?: RentalDetailsRequest
  ) => void;
}

const METHOD_TILES: Array<{ id: PaymentMethodTab; label: string; icon: typeof Banknote; activeClass: string }> = [
  { id: "CASH", label: "Efectivo", icon: Banknote, activeClass: "border-cash bg-cash/10 text-cash" },
  { id: "TRANSFER", label: "Transferencia", icon: Landmark, activeClass: "border-transfer bg-transfer/10 text-transfer" },
  { id: "MIXED", label: "Mixto", icon: Split, activeClass: "border-info bg-info/10 text-info" },
  { id: "CREDIT", label: "Credito", icon: Wallet2, activeClass: "border-credit bg-credit/10 text-credit" },
];

function money(value: number) {
  return `RD$${value.toFixed(2)}`;
}

export function CheckoutPanel({
  registerId,
  customer,
  preDiscountTotal,
  disabled,
  isSubmitting,
  fiscalModuleEnabled,
  fiscalSequences,
  cashDenominationsEnabled,
  hasRentalItems,
  onConfirm,
}: CheckoutPanelProps) {
  const canDiscount = usePermission("SALE_DISCOUNT");
  const canAuthorizeCredit = usePermission("CREDIT_AUTHORIZE");
  const [discountInput, setDiscountInput] = useState("");
  const [method, setMethod] = useState<PaymentMethodTab>("CASH");
  const [fiscalReceiptType, setFiscalReceiptType] = useState<FiscalReceiptType | "">("");
  const [receivedEntries, setReceivedEntries] = useState<DenominationCountEntry[]>([]);
  const [receivedAmountInput, setReceivedAmountInput] = useState("");
  const [mixedCashInput, setMixedCashInput] = useState("");
  const [mixedReceivedEntries, setMixedReceivedEntries] = useState<DenominationCountEntry[]>([]);
  const [mixedReceivedAmountInput, setMixedReceivedAmountInput] = useState("");
  const [mixedSecondMethod, setMixedSecondMethod] = useState<"TRANSFER" | "CREDIT">("CREDIT");
  const [bank, setBank] = useState("");
  const [reference, setReference] = useState("");
  const [mixedBank, setMixedBank] = useState("");
  const [mixedReference, setMixedReference] = useState("");
  const [rentalReturnAt, setRentalReturnAt] = useState("");
  const [rentalDeposit, setRentalDeposit] = useState("0");
  const [rentalNotes, setRentalNotes] = useState("");

  const { data: denominations } = useQuery({
    queryKey: ["denominations"],
    queryFn: fetchDenominations,
    enabled: cashDenominationsEnabled,
  });

  const discountAmount = canDiscount ? Math.max(0, parseFloat(discountInput) || 0) : 0;
  const saleTotal = Math.max(0, preDiscountTotal - discountAmount);
  const rentalDepositAmount = hasRentalItems ? Math.max(0, Number(rentalDeposit) || 0) : 0;
  const total = saleTotal + rentalDepositAmount;
  const mixedCashAmount = Math.max(0, Number(mixedCashInput) || 0);
  const mixedRemainingAmount = Math.max(0, total - mixedCashAmount);
  const mixedTransferAmount = mixedSecondMethod === "TRANSFER" ? mixedRemainingAmount : 0;
  const mixedCreditAmount = mixedSecondMethod === "CREDIT" ? mixedRemainingAmount : 0;

  const sumDenominations = (entries: DenominationCountEntry[]) =>
    entries.reduce((sum, e) => {
      const denom = denominations?.find((d) => d.id === e.denominationId);
      return sum + (denom ? Number(denom.value) * e.quantity : 0);
    }, 0);

  const receivedTotal = sumDenominations(receivedEntries);
  const mixedReceivedTotal = sumDenominations(mixedReceivedEntries);
  const directReceivedAmount = Math.max(0, Number(receivedAmountInput) || 0);
  const directChangeAmount = directReceivedAmount - total;
  const mixedDirectReceivedAmount = Math.max(0, Number(mixedReceivedAmountInput) || 0);
  const mixedDirectChangeAmount = mixedDirectReceivedAmount - mixedCashAmount;
  const changeAmountCents = Math.round((receivedTotal - total) * 100);
  const mixedChangeAmountCents = Math.round((mixedReceivedTotal - mixedCashAmount) * 100);

  const { data: suggestion } = useQuery({
    queryKey: ["change-suggestion", registerId, changeAmountCents, receivedEntries],
    queryFn: () => fetchChangeSuggestion(registerId, changeAmountCents, receivedEntries),
    enabled: cashDenominationsEnabled && method === "CASH" && changeAmountCents >= 0 && receivedEntries.length > 0 && total > 0,
  });

  const { data: mixedSuggestion } = useQuery({
    queryKey: ["mixed-change-suggestion", registerId, mixedChangeAmountCents, mixedReceivedEntries],
    queryFn: () => fetchChangeSuggestion(registerId, mixedChangeAmountCents, mixedReceivedEntries),
    enabled:
      cashDenominationsEnabled &&
      method === "MIXED" &&
      mixedCashAmount > 0 &&
      mixedChangeAmountCents >= 0 &&
      mixedReceivedEntries.length > 0,
  });

  const { data: creditProfile } = useQuery({
    queryKey: ["credit-profile", customer?.id],
    queryFn: () => fetchCreditProfile(customer!.id),
    enabled: (method === "CREDIT" || (method === "MIXED" && mixedSecondMethod === "CREDIT")) && !!customer,
  });

  const { data: creditAccount } = useQuery({
    queryKey: ["credit-account", customer?.id],
    queryFn: () => fetchCreditAccount(customer!.id),
    enabled: (method === "CREDIT" || (method === "MIXED" && mixedSecondMethod === "CREDIT")) && !!customer,
  });

  const creditAvailable =
    creditProfile && creditAccount
      ? creditProfile.creditLimit == null
        ? Infinity
        : Number(creditProfile.creditLimit) - Number(creditAccount.balance)
      : null;
  const creditEligible = canAuthorizeCredit && !!customer && creditProfile?.creditEnabled === true;
  const creditWithinLimit = creditAvailable !== null && total <= creditAvailable;
  const mixedCreditWithinLimit = creditAvailable !== null && mixedCreditAmount <= creditAvailable;

  const cashReady = cashDenominationsEnabled
    ? method === "CASH" && changeAmountCents >= 0 && receivedEntries.length > 0 && suggestion?.exact === true
    : method === "CASH" && directReceivedAmount >= total;
  const mixedCashReady = cashDenominationsEnabled
    ? mixedChangeAmountCents >= 0 && mixedReceivedEntries.length > 0 && mixedSuggestion?.exact === true
    : mixedDirectReceivedAmount >= mixedCashAmount;
  const transferReady = method === "TRANSFER" && bank.trim() !== "" && reference.trim() !== "";
  const mixedReady =
    method === "MIXED" &&
    mixedCashAmount > 0 &&
    mixedCashAmount < total &&
    mixedRemainingAmount > 0 &&
    mixedCashReady &&
    (mixedSecondMethod === "TRANSFER"
      ? mixedBank.trim() !== "" && mixedReference.trim() !== ""
      : creditEligible && mixedCreditWithinLimit);
  const creditReady = method === "CREDIT" && creditEligible && creditWithinLimit;
  const rentalReady = !hasRentalItems || (customer != null && rentalReturnAt.trim() !== "");
  const canConfirm = !disabled && total > 0 && rentalReady && (cashReady || transferReady || mixedReady || creditReady) && !isSubmitting;

  const handleConfirm = () => {
    const payments: PaymentRequest[] =
      method === "CASH"
        ? [
            {
              method: "CASH",
              amount: total.toFixed(2),
              receivedDenominations: cashDenominationsEnabled ? receivedEntries : [],
            },
          ]
        : method === "TRANSFER"
          ? [{ method: "TRANSFER", amount: total.toFixed(2), bank, reference }]
          : method === "MIXED"
            ? mixedSecondMethod === "TRANSFER"
              ? [
                  {
                    method: "CASH",
                    amount: mixedCashAmount.toFixed(2),
                    receivedDenominations: cashDenominationsEnabled ? mixedReceivedEntries : [],
                  },
                  {
                    method: "TRANSFER",
                    amount: mixedTransferAmount.toFixed(2),
                    bank: mixedBank,
                    reference: mixedReference,
                  },
                ]
              : [
                  {
                    method: "CASH",
                    amount: mixedCashAmount.toFixed(2),
                    receivedDenominations: cashDenominationsEnabled ? mixedReceivedEntries : [],
                  },
                  { method: "CREDIT", amount: mixedCreditAmount.toFixed(2) },
                ]
            : [{ method: "CREDIT", amount: total.toFixed(2) }];
    const rentalDetails = hasRentalItems
      ? {
          expectedReturnAt: new Date(rentalReturnAt).toISOString(),
          depositAmount: rentalDeposit || "0",
          notes: rentalNotes.trim() || undefined,
        }
      : undefined;
    onConfirm(payments, discountAmount, fiscalReceiptType || null, rentalDetails);
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

        <div className="rounded-xl bg-primary/5 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total a cobrar</p>
          <p className="font-mono-money font-display text-4xl font-extrabold text-primary">{money(total)}</p>
          {hasRentalItems && (
            <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
              <span>Alquiler: {money(saleTotal)}</span>
              <span>Deposito: {money(rentalDepositAmount)}</span>
            </div>
          )}
        </div>

        {fiscalModuleEnabled && (
          <div className="space-y-2">
            <Label htmlFor="fiscal-receipt-type">Comprobante fiscal</Label>
            <select
              id="fiscal-receipt-type"
              value={fiscalReceiptType}
              onChange={(event) => setFiscalReceiptType(event.target.value as FiscalReceiptType | "")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Factura normal</option>
              {fiscalSequences
                .filter((sequence) => sequence.active && sequence.remaining > 0)
                .map((sequence) => (
                  <option key={sequence.id} value={sequence.receiptType}>
                    {sequence.receiptType} - proximo {sequence.nextNcf}
                  </option>
                ))}
            </select>
            {fiscalSequences.filter((sequence) => sequence.active && sequence.remaining > 0).length === 0 && (
              <p className="text-xs text-muted-foreground">No hay secuencias NCF activas disponibles.</p>
            )}
          </div>
        )}

        {hasRentalItems && (
          <div className="space-y-3 rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Contrato de alquiler</p>
              <p className="text-xs text-muted-foreground">Se creara un contrato activo ligado a esta factura.</p>
            </div>
            {!customer && <p className="text-sm text-destructive">Selecciona un cliente para facturar alquileres.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rental-return-at">Devolucion esperada</Label>
                <Input
                  id="rental-return-at"
                  type="datetime-local"
                  value={rentalReturnAt}
                  onChange={(event) => setRentalReturnAt(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rental-deposit">Deposito</Label>
                <Input
                  id="rental-deposit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rentalDeposit}
                  onChange={(event) => setRentalDeposit(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rental-notes">Notas</Label>
              <Input id="rental-notes" value={rentalNotes} onChange={(event) => setRentalNotes(event.target.value)} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {METHOD_TILES.map((tile) => {
            const Icon = tile.icon;
            const active = method === tile.id;
            const isCreditDisabled = tile.id === "CREDIT" && (!customer || !canAuthorizeCredit);
            return (
              <button
                key={tile.id}
                type="button"
                disabled={isCreditDisabled}
                title={
                  isCreditDisabled
                    ? !canAuthorizeCredit
                      ? "Tu usuario no tiene permiso para vender a credito"
                      : "Selecciona un cliente para vender a credito"
                    : undefined
                }
                onClick={() => setMethod(tile.id)}
                className={cn(
                  "flex min-h-20 flex-col items-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40",
                  active ? tile.activeClass : "border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                <Icon className="h-5 w-5" />
                {tile.label}
              </button>
            );
          })}
        </div>

        {method === "CASH" ? (
          <div className="space-y-3">
            {cashDenominationsEnabled ? (
              <>
                <DenominationCountGrid onChange={setReceivedEntries} />
                {receivedEntries.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Recibido: {money(receivedTotal)}
                    {changeAmountCents >= 0 && ` · Cambio: ${money(changeAmountCents / 100)}`}
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
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="cash-received-amount">Recibido</Label>
                <Input
                  id="cash-received-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={receivedAmountInput}
                  onChange={(event) => setReceivedAmountInput(event.target.value)}
                />
                {receivedAmountInput.trim() !== "" && (
                  <p className={cn("text-sm", directChangeAmount < 0 ? "text-destructive" : "text-muted-foreground")}>
                    {directChangeAmount < 0
                      ? "Recibido insuficiente para cubrir el total."
                      : `Cambio: ${money(directChangeAmount)}`}
                  </p>
                )}
              </div>
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
        ) : method === "MIXED" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mixed-cash-amount">Monto en efectivo</Label>
                <Input
                  id="mixed-cash-amount"
                  type="number"
                  min="0.01"
                  max={total}
                  step="0.01"
                  value={mixedCashInput}
                  onChange={(event) => setMixedCashInput(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mixed-second-method">Restante en</Label>
                <select
                  id="mixed-second-method"
                  value={mixedSecondMethod}
                  onChange={(event) => setMixedSecondMethod(event.target.value as "TRANSFER" | "CREDIT")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="TRANSFER">Transferencia</option>
                  <option value="CREDIT" disabled={!canAuthorizeCredit}>
                    Credito
                  </option>
                </select>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">
                {mixedSecondMethod === "TRANSFER" ? "Monto por transferencia" : "Monto a credito"}
              </p>
              <p className="font-mono-money text-lg font-bold">{money(mixedRemainingAmount)}</p>
            </div>

            {mixedCashAmount <= 0 && <p className="text-sm text-muted-foreground">Indica cuanto pagara en efectivo.</p>}
            {mixedCashAmount >= total && total > 0 && (
              <p className="text-sm text-destructive">El efectivo debe ser menor que el total para usar pago mixto.</p>
            )}

            {mixedCashAmount > 0 && mixedCashAmount < total && (
              <>
                {cashDenominationsEnabled ? (
                  <div className="space-y-3">
                    <DenominationCountGrid onChange={setMixedReceivedEntries} />
                    {mixedReceivedEntries.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Recibido efectivo: {money(mixedReceivedTotal)}
                        {mixedChangeAmountCents >= 0 && ` · Cambio: ${money(mixedChangeAmountCents / 100)}`}
                      </p>
                    )}
                    {mixedChangeAmountCents < 0 && mixedReceivedEntries.length > 0 && (
                      <p className="text-sm text-destructive">Recibido insuficiente para cubrir la parte en efectivo.</p>
                    )}
                    {mixedChangeAmountCents >= 0 && mixedReceivedEntries.length > 0 && mixedSuggestion && !mixedSuggestion.exact && (
                      <p className="text-sm text-destructive">No hay combinacion exacta de cambio disponible.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="mixed-received-amount">Recibido en efectivo</Label>
                    <Input
                      id="mixed-received-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={mixedReceivedAmountInput}
                      onChange={(event) => setMixedReceivedAmountInput(event.target.value)}
                    />
                    {mixedReceivedAmountInput.trim() !== "" && (
                      <p className={cn("text-sm", mixedDirectChangeAmount < 0 ? "text-destructive" : "text-muted-foreground")}>
                        {mixedDirectChangeAmount < 0
                          ? "Recibido insuficiente para cubrir la parte en efectivo."
                          : `Cambio: ${money(mixedDirectChangeAmount)}`}
                      </p>
                    )}
                  </div>
                )}

                {mixedSecondMethod === "TRANSFER" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="mixed-transfer-bank">Banco</Label>
                      <Input id="mixed-transfer-bank" value={mixedBank} onChange={(e) => setMixedBank(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mixed-transfer-reference">Referencia</Label>
                      <Input id="mixed-transfer-reference" value={mixedReference} onChange={(e) => setMixedReference(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-md border border-border p-3">
                    {!canAuthorizeCredit && (
                      <p className="text-sm text-destructive">Tu usuario no tiene permiso para vender a credito.</p>
                    )}
                    {canAuthorizeCredit && !customer && (
                      <p className="text-sm text-destructive">Selecciona un cliente para vender a credito.</p>
                    )}
                    {customer && creditProfile && !creditProfile.creditEnabled && (
                      <p className="text-sm text-destructive">Este cliente no tiene credito habilitado.</p>
                    )}
                    {customer && creditEligible && creditAccount && creditProfile && (
                      <>
                        <p className="text-sm">
                          Balance actual: RD${creditAccount.balance} - Limite:{" "}
                          {creditProfile.creditLimit == null ? "Sin limite" : `RD$${creditProfile.creditLimit}`}
                        </p>
                        <p className="text-sm font-medium">
                          Disponible: {creditAvailable === Infinity ? "Sin limite" : `RD$${creditAvailable?.toFixed(2)}`}
                        </p>
                        {!mixedCreditWithinLimit && (
                          <p className="text-sm text-destructive">La parte a credito excede el disponible.</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {!canAuthorizeCredit && (
              <p className="text-sm text-destructive">Tu usuario no tiene permiso para vender a credito.</p>
            )}
            {canAuthorizeCredit && !customer && (
              <p className="text-sm text-destructive">Selecciona un cliente para vender a credito.</p>
            )}
            {customer && creditProfile && !creditProfile.creditEnabled && (
              <p className="text-sm text-destructive">Este cliente no tiene credito habilitado.</p>
            )}
            {customer && creditEligible && creditAccount && creditProfile && (
              <>
                <p className="text-sm">
                  Balance actual: RD${creditAccount.balance} · Limite:{" "}
                  {creditProfile.creditLimit == null ? "Sin limite" : `RD$${creditProfile.creditLimit}`}
                </p>
                <p className="text-sm font-medium">
                  Disponible: {creditAvailable === Infinity ? "Sin limite" : `RD$${creditAvailable?.toFixed(2)}`}
                </p>
                {!creditWithinLimit && <p className="text-sm text-destructive">Excede el credito disponible.</p>}
              </>
            )}
          </div>
        )}

        <Button size="lg" className="w-full" variant="accent" disabled={!canConfirm} onClick={handleConfirm}>
          {isSubmitting ? "Cobrando..." : "Cobrar"}
        </Button>
      </CardContent>
    </Card>
  );
}
