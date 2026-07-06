"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ResetPasswordResponse, UserSummaryResponse } from "@/types/superadmin";

interface UsersPage {
  data: UserSummaryResponse[];
  meta: { total: number; page: number; limit: number };
}

async function fetchUsers(email: string, page: number): Promise<UsersPage> {
  const res = await api.get<UsersPage>("/api/super-admin/users", { params: { email, page, size: 20 } });
  return res.data;
}

function dateOnly(value: string): string {
  return new Date(value).toLocaleDateString();
}

function ResetPasswordDialog({ user }: { user: UserSummaryResponse }) {
  const [open, setOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: ResetPasswordResponse }>(`/api/super-admin/users/${user.id}/reset-password`);
      return res.data.data;
    },
    onSuccess: (data) => {
      setTemporaryPassword(data.temporaryPassword);
      toast.success("Contrasena temporal generada");
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Error";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Reset password
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

export default function SuperAdminUsersPage() {
  const [email, setEmail] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["sa-users", email, page],
    queryFn: () => fetchUsers(email, page),
  });

  const users = data?.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Usuarios</h1>
      <Input
        placeholder="Buscar por email..."
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setPage(0);
        }}
        className="max-w-sm"
      />

      <Card>
        <CardHeader>
          <CardTitle>{data?.meta?.total ?? 0} usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
          {users.length === 0 && !isLoading && <p className="text-sm text-muted-foreground">Sin resultados.</p>}
          {users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2">Nombre</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Rol</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2">Creado</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border">
                      <td className="py-2">{u.name}</td>
                      <td className="py-2">{u.email}</td>
                      <td className="py-2">{u.role}</td>
                      <td className="py-2">{u.active ? "Activo" : "Inactivo"}</td>
                      <td className="py-2">{dateOnly(u.createdAt)}</td>
                      <td className="py-2 text-right">
                        <ResetPasswordDialog user={u} />
                      </td>
                    </tr>
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
