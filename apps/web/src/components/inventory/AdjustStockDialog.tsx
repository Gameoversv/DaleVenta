"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

const adjustSchema = z.object({
  type: z.enum(["ENTRY", "EXIT", "ADJUSTMENT"]),
  quantity: z.coerce.number().int().positive("Cantidad debe ser mayor a cero"),
  reason: z.string().min(1, "Motivo requerido"),
});
type AdjustFormInput = z.input<typeof adjustSchema>;
type AdjustFormOutput = z.output<typeof adjustSchema>;

interface AdjustStockDialogProps {
  branchId: string;
  productId: string;
  productName: string;
  trigger: React.ReactNode;
}

export function AdjustStockDialog({ branchId, productId, productName, trigger }: AdjustStockDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustFormInput, unknown, AdjustFormOutput>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { type: "ENTRY", quantity: 1, reason: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: AdjustFormOutput) =>
      api.post("/api/inventory/movements", { branchId, productId, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", branchId] });
      setOpen(false);
      reset();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al ajustar stock";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar stock de {productName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjust-type">Tipo</Label>
            <select
              id="adjust-type"
              {...register("type")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ENTRY">Entrada</option>
              <option value="EXIT">Salida</option>
              <option value="ADJUSTMENT">Ajuste</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjust-quantity">Cantidad</Label>
            <Input id="adjust-quantity" type="number" min={1} {...register("quantity")} />
            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjust-reason">Motivo</Label>
            <Input id="adjust-reason" {...register("reason")} />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
