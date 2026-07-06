import { ShoppingCart, Boxes, Wallet, Users, CreditCard, BarChart3, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/landing/shared/SectionHeading";

const PILLARS = [
  { icon: ShoppingCart, label: "Ventas" },
  { icon: Boxes, label: "Inventario" },
  { icon: Wallet, label: "Caja" },
  { icon: Users, label: "Clientes" },
  { icon: CreditCard, label: "Crédito" },
  { icon: BarChart3, label: "Reportes" },
  { icon: ShieldCheck, label: "Usuarios y permisos" },
];

export function SolutionSection() {
  return (
    <section className="bg-secondary/40 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="La solución"
          title="Con DaleVenta tienes el control completo de tu negocio."
          description="Todo lo que hoy manejas en libretas, Excel o WhatsApp, centralizado en un solo sistema."
        />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.label}
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center shadow-[var(--shadow-card)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <pillar.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-foreground">{pillar.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
