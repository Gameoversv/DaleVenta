import { SectionHeading } from "@/components/landing/shared/SectionHeading";
import { PricingCard } from "@/components/landing/shared/PricingCard";

const PLANS = [
  {
    name: "Básico",
    description: "Para negocios pequeños que necesitan vender y controlar caja.",
    price: "RD$1,500",
    features: ["1 sucursal", "1 caja", "Hasta 2 usuarios", "Punto de venta", "Inventario", "Clientes", "Cierre de caja"],
  },
  {
    name: "Pro",
    description: "Para negocios que necesitan más control y reportes.",
    price: "RD$2,500",
    highlighted: true,
    features: [
      "Hasta 2 sucursales",
      "Hasta 5 usuarios",
      "Inventario avanzado",
      "Clientes con crédito",
      "Reportes",
      "Usuarios y permisos",
      "Transferencias y pagos mixtos",
    ],
  },
  {
    name: "Negocio",
    description: "Para negocios con más operaciones.",
    price: "Desde RD$4,000",
    features: [
      "Sucursales adicionales",
      "Usuarios adicionales",
      "Reportes avanzados",
      "Auditoría",
      "Soporte prioritario",
      "Configuración personalizada",
    ],
  },
];

export function PricingSection() {
  return (
    <section id="precios" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        eyebrow="Planes"
        title="Un plan para cada tamaño de negocio."
        description="Precios de referencia, ajustables según las necesidades de tu negocio."
      />
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PricingCard key={plan.name} {...plan} />
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Los precios pueden ajustarse según el tamaño y las necesidades específicas de tu negocio.
      </p>
    </section>
  );
}
