import { ScanLine, PackagePlus, Calculator, Banknote, HeartHandshake, Landmark, UserCog, FileBarChart } from "lucide-react";
import { SectionHeading } from "@/components/landing/shared/SectionHeading";
import { FeatureCard } from "@/components/landing/shared/FeatureCard";

const FEATURES = [
  {
    icon: ScanLine,
    title: "Punto de venta rápido",
    description: "Vende productos del inventario, selecciona cliente, aplica método de pago y genera recibo en segundos.",
  },
  {
    icon: PackagePlus,
    title: "Inventario con alertas",
    description: "Configura mínimos y máximos para recibir alertas cuando un producto se esté agotando.",
  },
  {
    icon: Calculator,
    title: "Control de caja",
    description: "Apertura y cierre de caja con conteo inicial y final por denominaciones.",
  },
  {
    icon: Banknote,
    title: "Cambio exacto por billetes",
    description: "El sistema calcula cuánto devolver y sugiere las denominaciones disponibles en caja.",
  },
  {
    icon: HeartHandshake,
    title: "Clientes y crédito",
    description: "Registra clientes, define si tienen crédito, controla balances pendientes y pagos.",
  },
  {
    icon: Landmark,
    title: "Métodos de pago",
    description: "Acepta efectivo, transferencia, crédito o pagos mixtos en una misma venta.",
  },
  {
    icon: UserCog,
    title: "Usuarios y permisos",
    description: "El administrador decide qué puede hacer cada usuario dentro del sistema.",
  },
  {
    icon: FileBarChart,
    title: "Reportes",
    description: "Consulta ventas, inventario, caja, cuentas por cobrar y productos más vendidos.",
  },
];

export function FeaturesSection() {
  return (
    <section id="funciones" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        eyebrow="Funciones"
        title="Todo lo que tu negocio necesita para vender mejor."
        description="Un sistema completo, pensado para que lo use cualquier persona del equipo."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}
