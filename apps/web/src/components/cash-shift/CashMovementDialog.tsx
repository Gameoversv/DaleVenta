"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DenominationCountGrid } from "./DenominationCountGrid";
import type { CashMovementType, DenominationCountEntry } from "@/types/cash-shift";

interface CashMovementDialogProps {
  cashShiftId: string;
  registerId: string;
  trigger: React.ReactNode;
}

export function CashMovementDialog({ cashShiftId, registerId, trigger }: CashMovementDialogProps) {
  const { tenantFeatures } = useAuth();
  const denominationsEnabled = tenantFeatures.cashDenominationsEnabled;
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CashMovementType>("ENTRY");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [entries, setEntries] = useState<DenominationCountEntry[]>([]);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/api/cash-shifts/${cashShiftId}/movements`, {
        type,
        reason,
        amount: denominationsEnabled ? undefined : amount,
        denominations: denominationsEnabled ? entries : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-shift-current", registerId] });
      setOpen(false);
      setReason("");
      setAmount("");
      setEntries([]);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al registrar el movimiento";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="movement-type">Tipo</Label>
            <select
              id="movement-type"
              value={type}
              onChange={(e) => setType(e.target.value as CashMovementType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ENTRY">Entrada</option>
              <option value="WITHDRAWAL">Retiro</option>
              <option value="EXPENSE">Gasto</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="movement-reason">Motivo</Label>
            <Input id="movement-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {denominationsEnabled ? (
            <DenominationCountGrid onChange={setEntries} />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="movement-amount">Monto</Label>
              <Input
                id="movement-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={(denominationsEnabled ? entries.length === 0 : Number(amount) <= 0) || reason.trim() === "" || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
