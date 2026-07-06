import { Cake, Croissant, Coffee, Store, ShoppingBasket, ShoppingBag, Scissors, Building2 } from "lucide-react";
import { SectionHeading } from "@/components/landing/shared/SectionHeading";

const BUSINESS_TYPES = [
  { icon: Cake, name: "Reposterías", text: "Controla bizcochos, postres, pedidos, caja y clientes frecuentes." },
  { icon: Croissant, name: "Panaderías", text: "Organiza producción diaria, ventas de mostrador y clientes de crédito." },
  { icon: Coffee, name: "Cafeterías", text: "Vende rápido, maneja turnos y revisa tus productos más vendidos." },
  { icon: Store, name: "Colmados", text: "Controla inventario, caja y ventas del día sin depender de libretas." },
  { icon: ShoppingBasket, name: "Minimarkets", text: "Administra cientos de productos con alertas de inventario bajo." },
  { icon: ShoppingBag, name: "Tiendas", text: "Gestiona catálogo, clientes y métodos de pago mixtos." },
  { icon: Scissors, name: "Salones", text: "Registra servicios, clientes recurrentes y cobros del día." },
  { icon: Building2, name: "Pequeños comercios", text: "Un sistema simple para negocios que quieren crecer." },
];

export function BusinessTypesSection() {
  return (
    <section id="para-quien" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        eyebrow="Para quién es"
        title="Ideal para negocios que venden todos los días."
        description="DaleVenta se adapta al ritmo de tu negocio, sin importar el rubro."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BUSINESS_TYPES.map((type) => (
          <div key={type.name} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-secondary/10 text-brand-secondary">
              <type.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-foreground">{type.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{type.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
