"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DenominationCountGrid } from "./DenominationCountGrid";
import { InventoryCountGrid } from "./InventoryCountGrid";
import type { DenominationCountEntry, InventoryCountEntry } from "@/types/cash-shift";

export function OpenShiftForm({ registerId, branchId }: { registerId: string; branchId: string }) {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<DenominationCountEntry[]>([]);
  const [inventoryEntries, setInventoryEntries] = useState<InventoryCountEntry[]>([]);

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
        <DenominationCountGrid onChange={setEntries} />
        <InventoryCountGrid branchId={branchId} onChange={setInventoryEntries} />
        <Button disabled={entries.length === 0 || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Abriendo..." : "Abrir turno"}
        </Button>
      </CardContent>
    </Card>
  );
}
