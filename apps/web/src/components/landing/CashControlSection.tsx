import { SectionHeading } from "@/components/landing/shared/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const CASH_ROWS = [
  { label: "Fondo inicial", value: "RD$2,500" },
  { label: "Ventas en efectivo", value: "RD$8,750" },
  { label: "Transferencias", value: "RD$5,200" },
  { label: "Ventas a crédito", value: "RD$3,000" },
  { label: "Efectivo esperado", value: "RD$11,250" },
  { label: "Efectivo contado", value: "RD$11,250" },
];

export function CashControlSection() {
  return (
    <section className="bg-secondary/40 py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <SectionHeading
          align="left"
          eyebrow="Control de caja"
          title="Cuadra la caja sin dolores de cabeza."
          description="DaleVenta permite abrir un turno con el dinero inicial, registrar las denominaciones, vender durante el día y cerrar la caja comparando lo esperado contra lo contado."
        />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="font-display text-sm font-semibold text-foreground">Cierre de turno</span>
              <Badge variant="success">Caja cuadrada</Badge>
            </div>
            <dl className="mt-3 divide-y divide-border">
              {CASH_ROWS.map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 text-sm">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="font-mono-money font-medium text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="success">Cuadrado</Badge>
              <Badge variant="warning">Sobrante</Badge>
              <Badge variant="danger">Faltante</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
