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
import type { BranchResponse } from "@/types/branch";

const branchSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  address: z.string().optional(),
});
type BranchForm = z.infer<typeof branchSchema>;

interface BranchFormDialogProps {
  branch?: BranchResponse;
  trigger: React.ReactNode;
}

export function BranchFormDialog({ branch, trigger }: BranchFormDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!branch;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    defaultValues: { name: branch?.name ?? "", address: branch?.address ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (values: BranchForm) =>
      isEdit
        ? api.put(`/api/branches/${branch!.id}`, values)
        : api.post("/api/branches", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setOpen(false);
      reset();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al guardar";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar sucursal" : "Nueva sucursal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="branch-name">Nombre</Label>
            <Input id="branch-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-address">Direccion</Label>
            <Input id="branch-address" {...register("address")} />
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
