"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { sumDenominations } from "@/lib/checkout";
import { useDenominations } from "@/hooks/useDenominations";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { Tabs } from "@/components/ui/tabs";
import { CashCountSummary } from "./CashCountSummary";
import { DenominationCountGrid } from "./DenominationCountGrid";
import { InventoryCountGrid } from "./InventoryCountGrid";
import { Input } from "@/components/ui/input";
import type { CashShiftSummaryResponse, DenominationCountEntry, InventoryCountEntry } from "@/types/cash-shift";

interface CloseShiftFormProps {
  shift: CashShiftSummaryResponse;
  branchId: string;
  onCancel: () => void;
  onClosed: (closed: CashShiftSummaryResponse) => void;
}

export function CloseShiftForm({ shift, branchId, onCancel, onClosed }: Readonly<CloseShiftFormProps>) {
  const denominationsEnabled = useTenantFeatures().cashDenominationsEnabled;
  const [entries, setEntries] = useState<DenominationCountEntry[]>([]);
  const [countedCashInput, setCountedCashInput] = useState("");
  const [inventoryEntries, setInventoryEntries] = useState<InventoryCountEntry[]>([]);
  const [notes, setNotes] = useState("");
  const { data: denominations } = useDenominations(denominationsEnabled);

  const directCountedCash = Math.max(0, Number(countedCashInput) || 0);
  const countedCash = denominationsEnabled ? sumDenominations(entries, denominations) : directCountedCash;
  const expectedCash = Number(shift.expectedCash ?? "0");
  const hasCounted = denominationsEnabled ? entries.length > 0 : countedCashInput.trim() !== "";
  const isSquare = countedCash - expectedCash === 0;

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
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Error al cerrar el turno")),
  });

  const cashTab = denominationsEnabled ? (
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
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cerrar turno</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CashCountSummary expectedCash={expectedCash} countedCash={countedCash} hasCounted={hasCounted} />

        <Tabs
          items={[
            { value: "cash", label: "Efectivo", content: cashTab },
            {
              value: "inventory",
              label: "Inventario",
              content: <InventoryCountGrid branchId={branchId} onChange={setInventoryEntries} />,
            },
          ]}
        />
        <div className="space-y-2">
          <Label htmlFor="close-notes">
            Notas{" "}
            {hasCounted && !isSquare && <span className="text-warning">(obligatorio: hay diferencia de caja)</span>}
          </Label>
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
          <Button disabled={!hasCounted || mutation.isPending} onClick={() => mutation.mutate()}>
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
