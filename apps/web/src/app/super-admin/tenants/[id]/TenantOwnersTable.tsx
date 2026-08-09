import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserSummaryResponse } from "@/types/superadmin";

/** Who can administer this tenant, and whether their account still works. */
export function TenantOwnersTable({ owners }: Readonly<{ owners: UserSummaryResponse[] }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Administradores</CardTitle>
      </CardHeader>
      <CardContent>
        {owners.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este tenant no tiene administradores.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2">Nombre</th>
                <th className="py-2">Email</th>
                <th className="py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => (
                <tr key={owner.id} className="border-b border-border last:border-0">
                  <td className="py-2">{owner.name}</td>
                  <td className="py-2 text-muted-foreground">{owner.email}</td>
                  <td className="py-2">
                    <Badge variant={owner.active ? "success" : "secondary"}>
                      {owner.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
