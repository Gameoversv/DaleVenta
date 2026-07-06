"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionHeading } from "@/components/landing/shared/SectionHeading";
import { cn } from "@/lib/utils";

const FAQS = [
  { q: "¿DaleVenta funciona para una repostería?", a: "Sí. DaleVenta fue diseñado pensando en reposterías: control de productos, pedidos, caja y clientes frecuentes." },
  { q: "¿Puedo usarlo en una tablet?", a: "Sí, DaleVenta funciona desde el navegador en computadora, tablet o celular, sin instalar nada." },
  { q: "¿Puedo tener varios usuarios?", a: "Sí. Puedes crear varios usuarios y dar acceso a tu equipo según el plan contratado." },
  { q: "¿Puedo limitar lo que hace cada cajero?", a: "Sí. El administrador define permisos específicos por usuario: qué puede ver, vender o modificar." },
  { q: "¿El sistema controla crédito de clientes?", a: "Sí. Puedes habilitar crédito por cliente, definir límite y ver el balance pendiente en todo momento." },
  { q: "¿Puedo ver productos bajos?", a: "Sí. DaleVenta te avisa cuando un producto llega a su nivel mínimo configurado." },
  { q: "¿Puedo registrar transferencias?", a: "Sí. Puedes cobrar en efectivo, transferencia, crédito o combinando métodos de pago." },
  { q: "¿El sistema ayuda a cuadrar la caja?", a: "Sí. Puedes abrir y cerrar caja por denominaciones, comparando lo esperado contra lo contado." },
  { q: "¿Necesito instalar algo?", a: "No. DaleVenta funciona 100% desde el navegador, sin instalaciones ni equipos especiales." },
  { q: "¿Puedo solicitar una demo?", a: "Sí. Puedes solicitar una demo gratis o escribirnos por WhatsApp para agendar una presentación." },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading eyebrow="Preguntas frecuentes" title="Todo lo que necesitas saber." />
      <div className="mt-10 flex flex-col gap-3">
        {FAQS.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={faq.q} className="rounded-xl border border-border bg-card">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium text-foreground">{faq.q}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && <p className="px-5 pb-4 text-sm text-muted-foreground">{faq.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
