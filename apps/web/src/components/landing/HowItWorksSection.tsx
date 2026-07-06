import { SectionHeading } from "@/components/landing/shared/SectionHeading";

const STEPS = [
  { number: "1", title: "Configura tu negocio", text: "Crea tu cuenta y define sucursal, moneda y usuarios." },
  { number: "2", title: "Agrega productos y usuarios", text: "Carga tu inventario y da acceso a tu equipo." },
  { number: "3", title: "Empieza a vender desde el POS", text: "Cobra en efectivo, transferencia o crédito." },
  { number: "4", title: "Revisa caja, inventario y reportes", text: "Toma decisiones con información real." },
];

export function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading eyebrow="Cómo funciona" title="Empezar es simple." />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <div key={step.number} className="relative rounded-xl border border-border bg-card p-6">
            <span className="font-display text-3xl font-bold text-primary/20">{step.number}</span>
            <h3 className="mt-2 font-display text-base font-semibold text-foreground">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
