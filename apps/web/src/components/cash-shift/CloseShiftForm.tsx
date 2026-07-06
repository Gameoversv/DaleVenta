"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { Tabs } from "@/components/ui/tabs";
import { DenominationCountGrid } from "./DenominationCountGrid";
import { InventoryCountGrid } from "./InventoryCountGrid";
import type { CashShiftSummaryResponse, DenominationCountEntry, InventoryCountEntry } from "@/types/cash-shift";

interface CloseShiftFormProps {
  shift: CashShiftSummaryResponse;
  branchId: string;
  onCancel: () => void;
  onClosed: (closed: CashShiftSummaryResponse) => void;
}

export function CloseShiftForm({ shift, branchId, onCancel, onClosed }: CloseShiftFormProps) {
  const [entries, setEntries] = useState<DenominationCountEntry[]>([]);
  const [inventoryEntries, setInventoryEntries] = useState<InventoryCountEntry[]>([]);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ data: CashShiftSummaryResponse }>(`/api/cash-shifts/${shift.id}/close`, {
        closingCounts: entries,
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
        <Tabs
          items={[
            { value: "cash", label: "Efectivo", content: <DenominationCountGrid onChange={setEntries} /> },
            {
              value: "inventory",
              label: "Inventario",
              content: <InventoryCountGrid branchId={branchId} onChange={setInventoryEntries} />,
            },
          ]}
        />
        <div className="space-y-2">
          <Label htmlFor="close-notes">Notas (obligatorio si hay diferencia de caja o inventario)</Label>
          <textarea
            id="close-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex gap-2">
          <Button disabled={entries.length === 0 || mutation.isPending} onClick={() => mutation.mutate()}>
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
