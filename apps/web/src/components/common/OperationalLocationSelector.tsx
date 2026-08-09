import type { ReactNode } from "react";
import { Building2, MonitorCog } from "lucide-react";
import { ErrorState, EmptyState } from "@/components/common/empty-state";
import type { OperationalLocation } from "@/hooks/useOperationalLocation";

interface OperationalLocationSelectorProps {
  location: OperationalLocation;
  requireRegister?: boolean;
  idPrefix: string;
  emptyBranchAction?: ReactNode;
  emptyRegisterAction?: ReactNode;
}

/**
 * A visible, shared location context for operational screens. It never guesses when a user has
 * more than one permitted location, and explains the next step when no location is available.
 */
export function OperationalLocationSelector({
  location,
  requireRegister = true,
  idPrefix,
  emptyBranchAction,
  emptyRegisterAction,
}: Readonly<OperationalLocationSelectorProps>) {
  if (location.branchesError) {
    return <ErrorState message="No se pudieron cargar las sucursales disponibles." />;
  }

  if (location.branchesLoading) {
    return <p className="text-sm text-muted-foreground">Cargando sucursales disponibles...</p>;
  }

  if (location.hasNoBranches) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4">
        <EmptyState
          message="No tienes una sucursal operativa disponible. Si eres cajero, pide a un administrador que te asigne una sucursal y una caja."
          action={emptyBranchAction}
        />
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label="Contexto operativo">
      <p className="mb-3 text-sm font-medium">Contexto operativo</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <LocationField icon={<Building2 className="h-4 w-4" />} label="Sucursal">
          {location.hasMultipleBranches ? (
            <select
              id={`${idPrefix}-branch`}
              aria-label="Sucursal"
              value={location.branchId}
              onChange={(event) => location.selectBranch(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecciona una sucursal</option>
              {location.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="pt-2 text-sm font-medium">{location.selectedBranch?.name}</p>
          )}
        </LocationField>

        {requireRegister && (
          <LocationField icon={<MonitorCog className="h-4 w-4" />} label="Caja">
            {location.hasMultipleRegisters ? (
              <select
                id={`${idPrefix}-register`}
                aria-label="Caja"
                value={location.registerId}
                onChange={(event) => location.selectRegister(event.target.value)}
                disabled={!location.branchId || location.registersLoading || location.registersError}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {location.registersLoading ? "Cargando cajas..." : "Selecciona una caja"}
                </option>
                {location.registers.map((register) => (
                  <option key={register.id} value={register.id}>
                    {register.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="pt-2 text-sm font-medium">
                {location.registersLoading ? "Cargando cajas..." : location.selectedRegister?.name ?? "Sin caja"}
              </p>
            )}
          </LocationField>
        )}
      </div>

      {location.registersError && <ErrorState message="No se pudieron cargar las cajas de esta sucursal." className="mt-3" />}
      {location.needsBranchSelection && (
        <p className="mt-3 text-sm text-muted-foreground">Selecciona la sucursal donde deseas operar.</p>
      )}
      {location.hasNoRegisters && (
        <div className="mt-3 rounded-md border border-dashed border-border p-3">
          <EmptyState
            message="Esta sucursal no tiene una caja operativa disponible. Si eres cajero, solicita una asignación de caja."
            action={emptyRegisterAction}
          />
        </div>
      )}
      {location.needsRegisterSelection && (
        <p className="mt-3 text-sm text-muted-foreground">Selecciona la caja donde deseas operar.</p>
      )}
    </section>
  );
}

function LocationField({ icon, label, children }: Readonly<{ icon: ReactNode; label: string; children: ReactNode }>) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      {children}
    </div>
  );
}
