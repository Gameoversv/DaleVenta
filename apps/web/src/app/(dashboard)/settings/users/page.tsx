"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, KeyRound, Pencil, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/page-header";
import { PermissionDenied } from "@/components/common/permission-denied";
import { EmptyState, ErrorState } from "@/components/common/empty-state";
import type {
  CreateUserRequest,
  PermissionEffect,
  RoleName,
  UpdateUserRequest,
  UserAssignments,
  UserPermissionRow,
  UserResponse,
} from "@/types/auth";
import type { BranchResponse, RegisterResponse } from "@/types/branch";

const PERMISSION_LABELS: Record<string, string> = {
  INVENTORY_VIEW: "Ver inventario",
  INVENTORY_CREATE: "Crear inventario",
  INVENTORY_EDIT: "Editar inventario",
  INVENTORY_ADJUST: "Ajustar inventario",
  COST_VIEW: "Ver costos",
  PRICE_VIEW: "Ver precios",
  SALE_CREATE: "Crear ventas",
  SALE_DISCOUNT: "Aplicar descuentos",
  SALE_PRICE_OVERRIDE: "Sobrescribir precio",
  SALE_VOID: "Anular ventas",
  SALE_RETURN: "Devoluciones",
  CASHSHIFT_OPEN: "Abrir turno de caja",
  CASHSHIFT_CLOSE: "Cerrar turno de caja",
  CASHSHIFT_VIEW_HISTORY: "Ver historial de caja",
  CUSTOMER_CREATE: "Crear clientes",
  CUSTOMER_EDIT: "Editar clientes",
  CREDIT_AUTHORIZE: "Autorizar credito",
  CREDIT_RECEIVE_PAYMENT: "Recibir abonos",
  REPORTS_VIEW: "Ver reportes",
  PROFIT_VIEW: "Ver ganancias",
  USERS_MANAGE: "Administrar usuarios",
  SETTINGS_MANAGE: "Administrar ajustes",
  AUDIT_VIEW: "Ver auditoria",
  DASHBOARD_VIEW: "Ver dashboard",
  SALE_VIEW_HISTORY: "Ver historial de ventas",
  CUSTOMER_VIEW: "Ver clientes",
  SUPPLIER_VIEW: "Ver proveedores",
  SUPPLIER_MANAGE: "Administrar proveedores",
  PURCHASE_VIEW: "Ver compras",
  PURCHASE_CREATE: "Crear compras",
  PURCHASE_RECEIVE: "Recibir compras",
  PURCHASE_PAYABLE_VIEW: "Ver cuentas por pagar",
  PURCHASE_PAYMENT_RECORD: "Registrar pagos a proveedores",
};

type StaffRole = Exclude<RoleName, "SUPER_ADMIN" | "CLIENT">;

const STAFF_ROLES: StaffRole[] = ["ADMIN", "CASHIER"];

async function fetchUsers(): Promise<UserResponse[]> {
  const res = await api.get<{ data: UserResponse[] }>("/api/users");
  return res.data.data;
}

async function fetchBranches(): Promise<BranchResponse[]> {
  const res = await api.get<{ data: BranchResponse[] }>("/api/branches");
  return res.data.data;
}

async function fetchRegisters(branches: BranchResponse[]): Promise<RegisterResponse[]> {
  const results = await Promise.all(
    branches.map(async (branch) => {
      const res = await api.get<{ data: RegisterResponse[] }>("/api/registers", { params: { branchId: branch.id } });
      return res.data.data;
    })
  );
  return results.flat();
}

async function fetchAssignments(userId: string): Promise<UserAssignments> {
  const res = await api.get<{ data: UserAssignments }>(`/api/users/${userId}/assignments`);
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
  const [newPassword, setNewPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.put(`/api/users/${user.id}/password`, { newPassword }),
    onSuccess: () => {
      toast.success("Contrasena actualizada");
      setNewPassword("");
      setOpen(false);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "No se pudo cambiar la contrasena";
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cambiar contrasena">
          <KeyRound className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contrasena</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <p className="text-sm">
            Nueva contrasena para <span className="font-medium">{user.email}</span>.
          </p>
          <div className="space-y-2">
            <Label htmlFor={`new-password-${user.id}`}>Nueva contrasena</Label>
            <Input
              id={`new-password-${user.id}`}
              type="text"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimo 8 caracteres"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || newPassword.length < 8}>
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

async function fetchUserPermissions(userId: string): Promise<UserPermissionRow[]> {
  const res = await api.get<{ data: UserPermissionRow[] }>(`/api/users/${userId}/permissions`);
  return res.data.data;
}

function PermissionRowControl({ userId, row }: { userId: string; row: UserPermissionRow }) {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["user-permissions", userId] });

  const setOverride = useMutation({
    mutationFn: (effect: PermissionEffect) =>
      api.put(`/api/users/${userId}/permissions/${row.code}`, { effect }),
    onSuccess: invalidate,
    onError: () => toast.error("No se pudo actualizar el permiso"),
  });

  const clearOverride = useMutation({
    mutationFn: () => api.delete(`/api/users/${userId}/permissions/${row.code}`),
    onSuccess: invalidate,
    onError: () => toast.error("No se pudo actualizar el permiso"),
  });

  const value = row.override ?? "ROLE_DEFAULT";
  const pending = setOverride.isPending || clearOverride.isPending;

  return (
    <tr className="border-b last:border-b-0">
      <td className="py-2 pr-4">
        <p className="font-medium">{PERMISSION_LABELS[row.code] ?? row.code}</p>
        <p className="text-xs text-muted-foreground">
          {row.fromRole ? "Incluido por rol" : "No incluido por rol"} - efectivo: {row.effective ? "si" : "no"}
        </p>
      </td>
      <td className="py-2">
        <select
          value={value}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "ROLE_DEFAULT") {
              clearOverride.mutate();
            } else {
              setOverride.mutate(next as PermissionEffect);
            }
          }}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="ROLE_DEFAULT">Segun rol</option>
          <option value="GRANT">Otorgado</option>
          <option value="REVOKE">Revocado</option>
        </select>
      </td>
    </tr>
  );
}

function PermissionsDialog({ user }: { user: UserResponse }) {
  const [open, setOpen] = useState(false);
  const { data: rows, isLoading } = useQuery({
    queryKey: ["user-permissions", user.id],
    queryFn: () => fetchUserPermissions(user.id),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Permisos">
          <ShieldCheck className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permisos de {user.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Los permisos &quot;segun rol&quot; vienen del rol asignado. Otorgar o revocar crea una excepcion individual.
          </p>
          {isLoading && <p className="text-muted-foreground">Cargando permisos...</p>}
          {rows && (
            <table className="w-full text-sm">
              <tbody>
                {rows.map((row) => (
                  <PermissionRowControl key={row.code} userId={user.id} row={row} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const EMPTY_ASSIGNMENTS: UserAssignments = { branchIds: [], registerIds: [] };

function UserAssignmentsSummary({ user }: { user: UserResponse }) {
  const { data: assignments, isLoading, isError } = useQuery({
    queryKey: ["user-assignments", user.id],
    queryFn: () => fetchAssignments(user.id),
    enabled: user.role === "CASHIER",
  });

  if (user.role !== "CASHIER") return <span className="text-muted-foreground">Sin restriccion</span>;
  if (isLoading) return <span className="text-muted-foreground">Cargando...</span>;
  if (isError) return <span className="text-destructive">No disponible</span>;
  if (!assignments || assignments.branchIds.length === 0 || assignments.registerIds.length === 0) {
    return <span className="font-medium text-amber-700">Sin asignaciones</span>;
  }

  const branchLabel = `${assignments.branchIds.length} ${assignments.branchIds.length === 1 ? "sucursal" : "sucursales"}`;
  const registerLabel = `${assignments.registerIds.length} ${assignments.registerIds.length === 1 ? "caja" : "cajas"}`;
  return <span>{branchLabel} · {registerLabel}</span>;
}

function UserAssignmentsDialog({ user }: { user: UserResponse }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<UserAssignments | null>(null);
  const queryClient = useQueryClient();
  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ["assignment-branches"],
    queryFn: fetchBranches,
    enabled: open,
  });
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["user-assignments", user.id],
    queryFn: () => fetchAssignments(user.id),
    enabled: open,
  });
  const { data: registers, isLoading: registersLoading } = useQuery({
    queryKey: ["assignment-registers", branches?.map((branch) => branch.id)],
    queryFn: () => fetchRegisters(branches ?? []),
    enabled: open && branches !== undefined,
  });

  const values = draft ?? assignments ?? EMPTY_ASSIGNMENTS;
  const selectedBranchIds = new Set(values.branchIds);
  const selectedRegisterIds = new Set(values.registerIds);
  const registersById = new Map((registers ?? []).map((register) => [register.id, register]));

  const mutation = useMutation({
    mutationFn: (next: UserAssignments) => api.put(`/api/users/${user.id}/assignments`, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-assignments", user.id] });
      setDraft(null);
      setOpen(false);
      toast.success("Asignaciones actualizadas");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "No se pudieron actualizar las asignaciones";
      toast.error(message);
    },
  });

  const update = (next: UserAssignments) => setDraft(next);

  const toggleBranch = (branchId: string) => {
    if (selectedBranchIds.has(branchId)) {
      update({
        branchIds: values.branchIds.filter((id) => id !== branchId),
        registerIds: values.registerIds.filter((id) => registersById.get(id)?.branchId !== branchId),
      });
      return;
    }
    update({ ...values, branchIds: [...values.branchIds, branchId] });
  };

  const toggleRegister = (registerId: string) => {
    update({
      ...values,
      registerIds: selectedRegisterIds.has(registerId)
        ? values.registerIds.filter((id) => id !== registerId)
        : [...values.registerIds, registerId],
    });
  };

  const isLoading = branchesLoading || assignmentsLoading || registersLoading;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setDraft(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Asignar sucursales y cajas">
          <Building2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sucursales y cajas de {user.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            El cajero solo podra ver y operar las sucursales y cajas seleccionadas. Una caja requiere que su sucursal tambien este asignada.
          </p>
          {isLoading && <p className="text-muted-foreground">Cargando asignaciones...</p>}
          {!isLoading && branches?.length === 0 && <EmptyState message="No hay sucursales activas para asignar." />}
          {!isLoading && branches && branches.length > 0 && (
            <div className="space-y-3">
              {branches.map((branch) => {
                const branchRegisters = (registers ?? []).filter((register) => register.branchId === branch.id);
                return (
                  <div key={branch.id} className="rounded-lg border border-border p-3">
                    <label className="flex cursor-pointer items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={selectedBranchIds.has(branch.id)}
                        onChange={() => toggleBranch(branch.id)}
                      />
                      {branch.name}
                    </label>
                    {selectedBranchIds.has(branch.id) && (
                      <div className="mt-3 space-y-2 border-l border-border pl-4">
                        {branchRegisters.length === 0 && <p className="text-xs text-muted-foreground">Sin cajas activas.</p>}
                        {branchRegisters.map((register) => (
                          <label key={register.id} className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedRegisterIds.has(register.id)}
                              onChange={() => toggleRegister(register.id)}
                            />
                            {register.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate(values)} disabled={isLoading || mutation.isPending}>
            {mutation.isPending ? "Guardando..." : "Guardar asignaciones"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user }: { user: UserResponse }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<UpdateUserRequest>({
    name: user.name,
    email: user.email,
    role: user.role === "ADMIN" ? "ADMIN" : "CASHIER",
    active: user.active,
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: UpdateUserRequest) => api.put(`/api/users/${user.id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      toast.success("Usuario actualizado");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "No se pudo actualizar el usuario";
      toast.error(message);
    },
  });

  const update = (values: Partial<UpdateUserRequest>) => setForm((current) => ({ ...current, ...values }));

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setForm({
            name: user.name,
            email: user.email,
            role: user.role === "ADMIN" ? "ADMIN" : "CASHIER",
            active: user.active,
          });
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Editar usuario">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({
              ...form,
              name: form.name.trim(),
              email: form.email.trim(),
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor={`edit-user-name-${user.id}`}>Nombre</Label>
            <Input id={`edit-user-name-${user.id}`} value={form.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-user-email-${user.id}`}>Correo</Label>
            <Input
              id={`edit-user-email-${user.id}`}
              type="email"
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-user-role-${user.id}`}>Rol</Label>
            <select
              id={`edit-user-role-${user.id}`}
              value={form.role}
              onChange={(event) => update({ role: event.target.value as StaffRole })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {STAFF_ROLES.map((staffRole) => (
                <option key={staffRole} value={staffRole}>
                  {roleLabel(staffRole)}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(event) => update({ active: event.target.checked })} />
            Usuario activo
          </label>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !form.name.trim() || !form.email.trim()}>
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
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
    mutation.mutate({ name: user.name, email: user.email, role, active: user.active, ...values });
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
      <td className="py-3 pr-4 text-sm"><UserAssignmentsSummary user={user} /></td>
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
          <EditUserDialog user={user} />
          <PermissionsDialog user={user} />
          {role === "CASHIER" && <UserAssignmentsDialog user={user} />}
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
    return <PermissionDenied title="Usuarios" message="No tienes permiso para administrar usuarios." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" actions={<CreateUserDialog />} />

      <Card>
        <CardHeader>
          <CardTitle>Usuarios internos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando usuarios...</p>}
          {isError && <ErrorState message="No se pudieron cargar los usuarios." />}
          {users && users.length === 0 && <EmptyState message="No hay usuarios internos." />}
          {users && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Usuario</th>
                    <th className="py-2 pr-4 font-medium">Rol</th>
                    <th className="py-2 pr-4 font-medium">Estado</th>
                    <th className="py-2 pr-4 font-medium">Alcance operativo</th>
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
