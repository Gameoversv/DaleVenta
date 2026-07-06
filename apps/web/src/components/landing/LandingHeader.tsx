"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappLink, DEMO_WHATSAPP_MESSAGE } from "@/lib/landing";

const NAV_LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#funciones", label: "Funciones" },
  { href: "#para-quien", label: "Para quién es" },
  { href: "#precios", label: "Precios" },
  { href: "#faq", label: "Preguntas frecuentes" },
  { href: "#contacto", label: "Contacto" },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="#inicio" className="font-display text-xl font-bold text-foreground">
          Dale<span className="text-brand-secondary">Venta</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="outline" size="sm">
            <a href={whatsappLink(DEMO_WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Solicitar demo</Link>
          </Button>
        </div>

        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 pb-6 pt-2 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Button asChild variant="outline">
              <a href={whatsappLink(DEMO_WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer">
                Hablar por WhatsApp
              </a>
            </Button>
            <Button asChild>
              <Link href="/register">Solicitar demo</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
