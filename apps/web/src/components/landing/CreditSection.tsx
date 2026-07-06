import { SectionHeading } from "@/components/landing/shared/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const CUSTOMERS = [
  { name: "Ana Ramírez", limit: "RD$5,000", balance: "RD$1,200", status: "Al día" as const },
  { name: "Pedro Luis Féliz", limit: "RD$3,000", balance: "RD$3,000", status: "Vencido" as const },
  { name: "Colmado Los Amigos", limit: "RD$10,000", balance: "RD$4,500", status: "Al día" as const },
];

export function CreditSection() {
  return (
    <section className="bg-secondary/40 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Clientes y crédito"
          title="Controla quién te debe y cuánto te debe."
          description="Vender a crédito no tiene que ser un desorden."
        />
        <Card className="mt-10">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Cliente</th>
                  <th className="px-6 py-3 font-medium">Límite de crédito</th>
                  <th className="px-6 py-3 font-medium">Balance pendiente</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {CUSTOMERS.map((customer) => (
                  <tr key={customer.name}>
                    <td className="px-6 py-3.5 font-medium text-foreground">{customer.name}</td>
                    <td className="px-6 py-3.5 font-mono-money text-muted-foreground">{customer.limit}</td>
                    <td className="px-6 py-3.5 font-mono-money text-foreground">{customer.balance}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={customer.status === "Al día" ? "success" : "danger"}>{customer.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
