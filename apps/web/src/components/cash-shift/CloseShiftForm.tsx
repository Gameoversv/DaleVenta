"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Tabs } from "@/components/ui/tabs";
import { DenominationCountGrid } from "./DenominationCountGrid";
import { InventoryCountGrid } from "./InventoryCountGrid";
import { Input } from "@/components/ui/input";
import type { TenantFeatures } from "@/types/auth";
import { money } from "@/lib/money";
import type {
  CashShiftSummaryResponse,
  DenominationCountEntry,
  DenominationResponse,
  InventoryCountEntry,
} from "@/types/cash-shift";

interface CloseShiftFormProps {
  shift: CashShiftSummaryResponse;
  branchId: string;
  onCancel: () => void;
  onClosed: (closed: CashShiftSummaryResponse) => void;
}

async function fetchDenominations(): Promise<DenominationResponse[]> {
  const res = await api.get<{ data: DenominationResponse[] }>("/api/denominations");
  return res.data.data;
}

async function fetchTenantFeatures(): Promise<TenantFeatures> {
  const res = await api.get<{ data: TenantFeatures }>("/api/fiscal/status");
  return res.data.data;
}


export function CloseShiftForm({ shift, branchId, onCancel, onClosed }: CloseShiftFormProps) {
  const { tenantFeatures } = useAuth();
  const { data: liveTenantFeatures } = useQuery({ queryKey: ["tenant-features"], queryFn: fetchTenantFeatures });
  const denominationsEnabled = liveTenantFeatures?.cashDenominationsEnabled ?? tenantFeatures.cashDenominationsEnabled;
  const [entries, setEntries] = useState<DenominationCountEntry[]>([]);
  const [countedCashInput, setCountedCashInput] = useState("");
  const [inventoryEntries, setInventoryEntries] = useState<InventoryCountEntry[]>([]);
  const [notes, setNotes] = useState("");
  const { data: denominations } = useQuery({
    queryKey: ["denominations"],
    queryFn: fetchDenominations,
    enabled: denominationsEnabled,
  });

  const countedCash = entries.reduce((sum, e) => {
    const denom = denominations?.find((d) => d.id === e.denominationId);
    return sum + (denom ? Number(denom.value) * e.quantity : 0);
  }, 0);
  const directCountedCash = Math.max(0, Number(countedCashInput) || 0);
  const effectiveCountedCash = denominationsEnabled ? countedCash : directCountedCash;
  const expectedCash = Number(shift.expectedCash ?? "0");
  const difference = effectiveCountedCash - expectedCash;
  const hasCounted = denominationsEnabled ? entries.length > 0 : countedCashInput.trim() !== "";
  const isSquare = difference === 0;

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ data: CashShiftSummaryResponse }>(`/api/cash-shifts/${shift.id}/close`, {
        countedCash: denominationsEnabled ? undefined : directCountedCash.toFixed(2),
        closingCounts: denominationsEnabled ? entries : [],
        closingNotes: notes || undefined,
        inventoryCounts: inventoryEntries,
      }),
    onSuccess: (res) => {
      onClosed(res.data.data);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al cerrar el turno";
      toast.error(message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cerrar turno</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Efectivo esperado</p>
            <p className="font-mono-money text-lg font-bold">{money(expectedCash)}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Efectivo contado</p>
            <p className="font-mono-money text-lg font-bold">{hasCounted ? money(effectiveCountedCash) : "-"}</p>
          </div>
          <div
            className={cn(
              "col-span-2 rounded-lg border p-3 sm:col-span-2",
              !hasCounted
                ? "border-border"
                : isSquare
                  ? "border-success/30 bg-success/5"
                  : "border-warning/30 bg-warning/5"
            )}
          >
            <p className="text-xs text-muted-foreground">Diferencia</p>
            <div className="flex items-center gap-1.5">
              {hasCounted && (isSquare ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />)}
              <p
                className={cn(
                  "font-mono-money text-lg font-bold",
                  hasCounted && (isSquare ? "text-success" : "text-warning")
                )}
              >
                {hasCounted ? money(difference) : "-"}
              </p>
            </div>
            {hasCounted && (
              <p className="text-xs text-muted-foreground">
                {isSquare ? "Caja cuadrada" : difference > 0 ? "Sobrante" : "Faltante"}
              </p>
            )}
          </div>
        </div>

        <Tabs
          items={[
            {
              value: "cash",
              label: "Efectivo",
              content: denominationsEnabled ? (
                <DenominationCountGrid onChange={setEntries} />
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="counted-cash">Efectivo contado</Label>
                  <Input
                    id="counted-cash"
                    type="number"
                    min="0"
                    step="0.01"
                    value={countedCashInput}
                    onChange={(event) => setCountedCashInput(event.target.value)}
                  />
                </div>
              ),
            },
            {
              value: "inventory",
              label: "Inventario",
              content: <InventoryCountGrid branchId={branchId} onChange={setInventoryEntries} />,
            },
          ]}
        />
        <div className="space-y-2">
          <Label htmlFor="close-notes">Notas {!isSquare && hasCounted && <span className="text-warning">(obligatorio: hay diferencia de caja)</span>}</Label>
          <textarea
            id="close-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Explica la diferencia de caja o cualquier observacion del turno..."
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex gap-2">
          <Button
            disabled={(denominationsEnabled ? entries.length === 0 : countedCashInput.trim() === "") || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Cerrando..." : "Confirmar cierre"}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
