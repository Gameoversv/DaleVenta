"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import type { AuthResponse } from "@/types/auth";

const registerSchema = z.object({
  tenantName: z.string().min(1, "Nombre del negocio requerido"),
  adminName: z.string().min(1, "Tu nombre es requerido"),
  adminEmail: z.string().email("Correo invalido"),
  adminPassword: z.string().min(8, "Minimo 8 caracteres"),
  website: z.string().max(0).optional(),
});
type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterForm) {
    try {
      const res = await api.post<{ data: AuthResponse }>("/api/tenants/register", {
        tenant_name: values.tenantName,
        admin_name: values.adminName,
        admin_email: values.adminEmail,
        admin_password: values.adminPassword,
        website: values.website ?? "",
      });
      localStorage.setItem("token", res.data.data.token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error al registrar";
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Registra tu negocio</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Nombre del negocio</Label>
              <Input id="tenantName" {...register("tenantName")} />
              {errors.tenantName && <p className="text-sm text-destructive">{errors.tenantName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminName">Tu nombre</Label>
              <Input id="adminName" {...register("adminName")} />
              {errors.adminName && <p className="text-sm text-destructive">{errors.adminName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Correo</Label>
              <Input id="adminEmail" type="email" {...register("adminEmail")} />
              {errors.adminEmail && <p className="text-sm text-destructive">{errors.adminEmail.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Contrasena</Label>
              <Input id="adminPassword" type="password" {...register("adminPassword")} />
              {errors.adminPassword && <p className="text-sm text-destructive">{errors.adminPassword.message}</p>}
            </div>
            <div className="absolute left-[-9999px]" aria-hidden="true">
              <Label htmlFor="website">No llenar</Label>
              <Input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Registrando..." : "Registrar"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Inicia sesion
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
