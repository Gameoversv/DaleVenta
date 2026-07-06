import { SectionHeading } from "@/components/landing/shared/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, PackageSearch, RefreshCcw, Bell } from "lucide-react";

const INVENTORY_POINTS = [
  { icon: Check, text: "Ver existencias en tiempo real." },
  { icon: Bell, text: "Configurar mínimo y máximo por producto." },
  { icon: PackageSearch, text: "Recibir alertas de productos por agotarse." },
  { icon: RefreshCcw, text: "Consultar movimientos y evitar pérdidas por falta de control." },
];

export function InventorySection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <Card className="order-2 lg:order-1">
          <CardContent className="p-6">
            <p className="font-display text-sm font-semibold text-foreground">Bizcocho de chocolate</p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Existencia actual</p>
                <p className="font-mono-money text-2xl font-bold text-destructive">4</p>
              </div>
              <div>
                <p className="text-muted-foreground">Mínimo configurado</p>
                <p className="font-mono-money text-2xl font-bold text-foreground">5</p>
              </div>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <Badge variant="warning">Reponer producto</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="order-1 lg:order-2">
          <SectionHeading
            align="left"
            eyebrow="Inventario"
            title="No te quedes sin productos para vender."
            description="Detecta productos bajos antes de quedarte sin inventario."
          />
          <ul className="mt-6 flex flex-col gap-3">
            {INVENTORY_POINTS.map((point) => (
              <li key={point.text} className="flex items-start gap-3 text-sm text-foreground">
                <point.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {point.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
