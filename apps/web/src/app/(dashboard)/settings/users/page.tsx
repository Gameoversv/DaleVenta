"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateUserRequest, ResetUserPasswordResponse, RoleName, UpdateUserRequest, UserResponse } from "@/types/auth";

type StaffRole = Exclude<RoleName, "SUPER_ADMIN" | "CLIENT">;

const STAFF_ROLES: StaffRole[] = ["ADMIN", "CASHIER"];

async function fetchUsers(): Promise<UserResponse[]> {
  const res = await api.get<{ data: UserResponse[] }>("/api/users");
  return res.data.data;
}

function roleLabel(role: RoleName): string {
  if (role === "ADMIN") return "Administrador";
  if (role === "CASHIER") return "Cajero";
  if (role === "SUPER_ADMIN") return "Super admin";
  return "Cliente";
}

function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateUserRequest>({
    name: "",
    email: "",
    password: "",
    role: "CASHIER",
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CreateUserRequest) => api.post("/api/users", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setForm({ name: "", email: "", password: "", role: "CASHIER" });
      setOpen(false);
      toast.success("Usuario creado");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo crear el usuario";
      toast.error(message);
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Nombre</Label>
            <Input id="user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Correo</Label>
            <Input id="user-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">Contrasena inicial</Label>
            <Input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role">Rol</Label>
            <select
              id="user-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !form.name || !form.email || !form.password}>
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user }: { user: UserResponse }) {
  const [open, setOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: ResetUserPasswordResponse }>(`/api/users/${user.id}/reset-password`);
      return res.data.data;
    },
    onSuccess: (data) => {
      setTemporaryPassword(data.temporaryPassword);
      toast.success("Contrasena temporal generada");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "No se pudo resetear la contrasena";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Resetear contrasena">
          <KeyRound className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resetear contrasena</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            Se generara una contrasena temporal para <span className="font-medium">{user.email}</span>.
          </p>
          {temporaryPassword && (
            <div className="rounded-md border bg-muted p-3">
              <p className="text-muted-foreground">Contrasena temporal</p>
              <p className="font-mono text-lg font-semibold">{temporaryPassword}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Generando..." : "Generar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserRow({ user }: { user: UserResponse }) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<StaffRole>(user.role === "ADMIN" ? "ADMIN" : "CASHIER");

  const mutation = useMutation({
    mutationFn: (values: UpdateUserRequest) => api.put(`/api/users/${user.id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario actualizado");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "No se pudo actualizar el usuario";
      toast.error(message);
    },
  });

  const updateUser = (values: Partial<UpdateUserRequest>) => {
    mutation.mutate({ role, active: user.active, ...values });
  };

  return (
    <tr className="border-b last:border-b-0">
      <td className="py-3 pr-4">
        <p className="font-medium">{user.name}</p>
        <p className="text-muted-foreground">{user.email}</p>
      </td>
      <td className="py-3 pr-4">
        <select
          value={role}
          onChange={(event) => {
            const nextRole = event.target.value as StaffRole;
            setRole(nextRole);
            updateUser({ role: nextRole });
          }}
          disabled={mutation.isPending}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          {STAFF_ROLES.map((staffRole) => (
            <option key={staffRole} value={staffRole}>
              {roleLabel(staffRole)}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3 pr-4">{user.active ? "Activo" : "Inactivo"}</td>
      <td className="py-3">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateUser({ active: !user.active })}
            disabled={mutation.isPending}
          >
            {user.active ? "Desactivar" : "Activar"}
          </Button>
          <ResetPasswordDialog user={user} />
        </div>
      </td>
    </tr>
  );
}

export default function UsersSettingsPage() {
  const canManageUsers = usePermission("USERS_MANAGE");
  const { data: users, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: canManageUsers,
  });

  if (!canManageUsers) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-muted-foreground">No tienes permiso para administrar usuarios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <CreateUserDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios internos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando usuarios...</p>}
          {isError && <p className="text-sm text-destructive">No se pudieron cargar los usuarios.</p>}
          {users && users.length === 0 && <p className="text-sm text-muted-foreground">No hay usuarios internos.</p>}
          {users && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Usuario</th>
                    <th className="py-2 pr-4 font-medium">Rol</th>
                    <th className="py-2 pr-4 font-medium">Estado</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
