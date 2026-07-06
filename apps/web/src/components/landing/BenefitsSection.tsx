import { ShieldCheck, PackageCheck, UserCheck, HandCoins, CalendarCheck, LineChart, KeySquare, TrendingUp } from "lucide-react";
import { SectionHeading } from "@/components/landing/shared/SectionHeading";

const BENEFITS = [
  { icon: ShieldCheck, text: "Evita descuadres de caja." },
  { icon: PackageCheck, text: "Controla productos bajos." },
  { icon: UserCheck, text: "Reduce errores del cajero." },
  { icon: HandCoins, text: "Organiza las ventas a crédito." },
  { icon: CalendarCheck, text: "Sabe cuánto vende cada día." },
  { icon: LineChart, text: "Revisa reportes desde el panel." },
  { icon: KeySquare, text: "Da permisos diferentes a cada empleado." },
  { icon: TrendingUp, text: "Mejora la administración del negocio." },
];

export function BenefitsSection() {
  return (
    <section className="bg-secondary/40 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Beneficios"
          title="Más control, menos pérdidas y mejores decisiones."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <div key={benefit.text} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <benefit.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm font-medium text-foreground">{benefit.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
