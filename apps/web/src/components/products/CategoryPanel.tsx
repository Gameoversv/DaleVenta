"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";
import type { CategoryResponse } from "@/types/product";

async function fetchCategories(): Promise<CategoryResponse[]> {
  const res = await api.get<{ data: CategoryResponse[] }>("/api/categories");
  return res.data.data;
}

const categorySchema = z.object({ name: z.string().min(1, "Nombre requerido") });
type CategoryForm = z.infer<typeof categorySchema>;

interface CategoryPanelProps {
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryPanel({ selectedCategoryId, onSelectCategory }: CategoryPanelProps) {
  const queryClient = useQueryClient();
  const canCreate = usePermission("INVENTORY_CREATE");
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CategoryForm>({ resolver: zodResolver(categorySchema) });

  const mutation = useMutation({
    mutationFn: (values: CategoryForm) => api.post("/api/categories", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      reset();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al crear categoria";
      toast.error(message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={cn(
            "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
            selectedCategoryId === null && "bg-accent font-medium"
          )}
        >
          Todas
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
              selectedCategoryId === cat.id && "bg-accent font-medium"
            )}
          >
            {cat.name}
          </button>
        ))}
        {canCreate && (
          <form
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            className="flex gap-2 pt-2"
          >
            <Input placeholder="Nueva categoria" {...register("name")} />
            <Button type="submit" size="sm" disabled={isSubmitting}>
              +
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
