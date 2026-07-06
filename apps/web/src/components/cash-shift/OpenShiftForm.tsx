"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { DenominationCountGrid } from "./DenominationCountGrid";
import { InventoryCountGrid } from "./InventoryCountGrid";
import type { DenominationCountEntry, DenominationResponse, InventoryCountEntry } from "@/types/cash-shift";

async function fetchDenominations(): Promise<DenominationResponse[]> {
  const res = await api.get<{ data: DenominationResponse[] }>("/api/denominations");
  return res.data.data;
}

export function OpenShiftForm({ registerId, branchId }: { registerId: string; branchId: string }) {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<DenominationCountEntry[]>([]);
  const [inventoryEntries, setInventoryEntries] = useState<InventoryCountEntry[]>([]);
  const { data: denominations } = useQuery({ queryKey: ["denominations"], queryFn: fetchDenominations });

  const openingTotal = entries.reduce((sum, e) => {
    const denom = denominations?.find((d) => d.id === e.denominationId);
    return sum + (denom ? Number(denom.value) * e.quantity : 0);
  }, 0);

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/api/cash-shifts/open", {
        registerId,
        openingCounts: entries,
        inventoryCounts: inventoryEntries,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-shift-current", registerId] });
    },
    onError: (err: unknown) => {
      const response = (err as { response?: { status?: number; data?: { error?: string } } })?.response;
      if (response?.status === 409) {
        // Otra pestana/usuario abrio el turno primero: recuperar el estado real en vez de solo mostrar el error.
        queryClient.invalidateQueries({ queryKey: ["cash-shift-current", registerId] });
        return;
      }
      toast.error(response?.data?.error ?? "Error al abrir el turno");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abrir turno</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl bg-primary/5 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fondo inicial</p>
          <p className="font-mono-money font-display text-3xl font-extrabold text-primary">RD${openingTotal.toFixed(2)}</p>
        </div>
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
        <Button size="lg" disabled={entries.length === 0 || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Abriendo..." : "Abrir turno"}
        </Button>
      </CardContent>
    </Card>
  );
}
