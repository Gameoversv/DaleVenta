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
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";
import type { CustomerResponse } from "@/types/customer";

const customerSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  documentId: z.string().optional(),
  creditEnabled: z.boolean().optional(),
  creditLimit: z.string().optional(),
});
type CustomerForm = z.infer<typeof customerSchema>;

interface CustomerFormDialogProps {
  customer?: CustomerResponse;
  trigger: React.ReactNode;
}

export function CustomerFormDialog({ customer, trigger }: CustomerFormDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = !!customer;
  const canAuthorizeCredit = usePermission("CREDIT_AUTHORIZE");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: customer?.firstName ?? "",
      lastName: customer?.lastName ?? "",
      phone: customer?.phone ?? "",
      whatsapp: customer?.whatsapp ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
      documentId: customer?.documentId ?? "",
      creditEnabled: false,
      creditLimit: "",
    },
  });

  const creditEnabled = watch("creditEnabled");

  const mutation = useMutation({
    mutationFn: async (values: CustomerForm) => {
      const { creditEnabled: wantsCredit, creditLimit, ...customerFields } = values;
      if (isEdit) {
        return api.put(`/api/customers/${customer!.id}`, customerFields);
      }
      const res = await api.post<{ data: CustomerResponse }>("/api/customers", customerFields);
      const created = res.data.data;
      if (wantsCredit && canAuthorizeCredit) {
        await api.put(`/api/customers/${created.id}/credit-profile`, {
          creditEnabled: true,
          creditLimit: creditLimit && creditLimit.trim() !== "" ? creditLimit : null,
        });
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
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
          <DialogTitle>{isEdit ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer-first-name">Nombre</Label>
              <Input id="customer-first-name" {...register("firstName")} />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-last-name">Apellido</Label>
              <Input id="customer-last-name" {...register("lastName")} />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-phone">Telefono</Label>
            <Input id="customer-phone" {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-whatsapp">WhatsApp</Label>
            <Input id="customer-whatsapp" {...register("whatsapp")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-email">Email</Label>
            <Input id="customer-email" {...register("email")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-address">Direccion</Label>
            <Input id="customer-address" {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-document-id">Documento</Label>
            <Input id="customer-document-id" {...register("documentId")} />
          </div>
          {!isEdit && canAuthorizeCredit && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <input id="customer-credit-enabled" type="checkbox" {...register("creditEnabled")} />
                <Label htmlFor="customer-credit-enabled">Cliente tiene credito</Label>
              </div>
              {creditEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="customer-credit-limit">
                    Limite de credito (opcional, vacio = credito abierto)
                  </Label>
                  <Input id="customer-credit-limit" placeholder="Sin limite" {...register("creditLimit")} />
                </div>
              )}
            </div>
          )}
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
