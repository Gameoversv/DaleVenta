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
import { PRODUCT_UNITS } from "@/lib/product-units";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import type { CategoryResponse, ProductResponse } from "@/types/product";

const createSchema = z.object({
  categoryId: z.string().optional(),
  internalCode: z.string().min(1, "Codigo requerido"),
  barcode: z.string().optional(),
  description: z.string().min(1, "Descripcion requerida"),
  unit: z.string().min(1, "Unidad requerida"),
  cost: z.string().min(1, "Costo requerido"),
  salePrice: z.string().min(1, "Precio de venta requerido"),
  wholesalePrice: z.string().min(1, "Precio mayorista requerido"),
  taxRate: z.string().min(1, "Tasa de impuesto requerida"),
  tracksInventory: z.boolean(),
  rentable: z.boolean(),
});
type ProductForm = z.infer<typeof createSchema>;

interface ProductFormDialogProps {
  product?: ProductResponse;
  categories: CategoryResponse[];
  trigger: React.ReactNode;
}

export function ProductFormDialog({ product, categories, trigger }: ProductFormDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const tenantFeatures = useTenantFeatures();
  const isEdit = !!product;
  const hasCustomUnit = !!product?.unit && !PRODUCT_UNITS.some((unit) => unit.value === product.unit);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      categoryId: product?.categoryId ?? "",
      internalCode: product?.internalCode ?? "",
      barcode: product?.barcode ?? "",
      description: product?.description ?? "",
      unit: product?.unit ?? "unit",
      cost: product?.cost ?? "",
      salePrice: product?.salePrice ?? "",
      wholesalePrice: product?.wholesalePrice ?? "",
      taxRate: product?.taxRate ?? "",
      tracksInventory: product?.tracksInventory ?? true,
      rentable: product?.rentable ?? false,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ProductForm) =>
      isEdit
        ? api.put(`/api/products/${product!.id}`, {
            categoryId: values.categoryId || product!.categoryId,
            description: values.description,
            unit: values.unit,
            cost: values.cost,
            salePrice: values.salePrice,
            wholesalePrice: values.wholesalePrice,
            taxRate: values.taxRate,
            tracksInventory: values.tracksInventory,
            rentable: values.rentable,
            active: product!.active,
          })
        : api.post("/api/products", {
            ...values,
            categoryId: values.categoryId || undefined,
            barcode: values.barcode || undefined,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-category">Categoria</Label>
            <select
              id="product-category"
              {...register("categoryId")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{isEdit ? "Selecciona una categoria" : "General (automatico)"}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="product-code">Codigo interno</Label>
                <Input id="product-code" {...register("internalCode")} />
                {errors.internalCode && <p className="text-sm text-destructive">{errors.internalCode.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-barcode">Codigo de barras (opcional)</Label>
                <Input id="product-barcode" {...register("barcode")} />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="product-description">Descripcion</Label>
            <Input id="product-description" {...register("description")} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-unit">Unidad</Label>
            <select
              id="product-unit"
              {...register("unit")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {hasCustomUnit && <option value={product.unit}>{product.unit}</option>}
              {PRODUCT_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
            {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="product-cost">Costo</Label>
              <Input id="product-cost" {...register("cost")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-sale-price">Precio venta</Label>
              <Input id="product-sale-price" {...register("salePrice")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-wholesale-price">Precio mayorista</Label>
              <Input id="product-wholesale-price" {...register("wholesalePrice")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-tax-rate">Tasa de impuesto (%)</Label>
            <Input id="product-tax-rate" {...register("taxRate")} />
          </div>
          <div className="flex items-center gap-2">
            <input id="product-tracks-inventory" type="checkbox" {...register("tracksInventory")} />
            <Label htmlFor="product-tracks-inventory">Rastrea inventario</Label>
          </div>
          {tenantFeatures.rentalModuleEnabled && (
            <div className="flex items-center gap-2">
              <input id="product-rentable" type="checkbox" {...register("rentable")} />
              <Label htmlFor="product-rentable">Disponible para alquiler</Label>
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
