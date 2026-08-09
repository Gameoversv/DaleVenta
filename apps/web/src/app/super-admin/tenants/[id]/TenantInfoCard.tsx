import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dateOnly } from "@/lib/dates";
import type { TenantDetailResponse } from "@/types/superadmin";
import { TENANT_MODULES, isModuleEnabled } from "./tenant-modules";

function Field({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <p>
      {label}: <span className="text-muted-foreground">{value}</span>
    </p>
  );
}

/** Everything about the tenant that is read rather than changed here. */
export function TenantInfoCard({ tenant }: Readonly<{ tenant: TenantDetailResponse }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informacion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Field label="Ciudad" value={tenant.city ?? "-"} />
        <Field label="Telefono" value={tenant.phone ?? "-"} />
        <Field label="Email" value={tenant.email ?? "-"} />
        <Field label="RNC" value={tenant.rnc ?? "-"} />
        {TENANT_MODULES.map((module) => {
          const enabled = isModuleEnabled(tenant, module);
          return (
            <p key={module.key}>
              {module.label}:{" "}
              <Badge variant={enabled ? "success" : "secondary"}>
                {enabled ? module.onLabel : module.offLabel}
              </Badge>
            </p>
          );
        })}
        <Field label="Creado" value={dateOnly(tenant.createdAt)} />
        <Field label="Trial vence" value={dateOnly(tenant.trialEndsAt)} />
        <Field label="Usuarios" value={tenant.userCount} />
        <Field label="Clientes" value={tenant.customerCount} />
      </CardContent>
    </Card>
  );
}
