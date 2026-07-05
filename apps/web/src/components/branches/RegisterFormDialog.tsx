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
import type { RegisterResponse } from "@/types/branch";

const registerFormSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
});
type RegisterFormValues = z.infer<typeof registerFormSchema>;

interface RegisterFormDialogProps {
  branchId: string;
  register?: RegisterResponse;
  trigger: React.ReactNode;
}

export function RegisterFormDialog({ branchId, register: existingRegister, trigger }: RegisterFormDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!existingRegister;

  const {
    register: registerField,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: existingRegister?.name ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      isEdit
        ? api.put(`/api/registers/${existingRegister!.id}`, values)
        : api.post("/api/registers", { name: values.name, branchId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registers", branchId] });
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
          <DialogTitle>{isEdit ? "Editar caja" : "Nueva caja"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="register-name">Nombre</Label>
            <Input id="register-name" {...registerField("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
