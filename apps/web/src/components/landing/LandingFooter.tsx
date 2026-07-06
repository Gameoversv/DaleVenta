import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { whatsappLink, DEMO_WHATSAPP_MESSAGE } from "@/lib/landing";

const FOOTER_LINKS = [
  { href: "#funciones", label: "Funciones" },
  { href: "#para-quien", label: "Para quién es" },
  { href: "#precios", label: "Precios" },
  { href: "#faq", label: "Preguntas frecuentes" },
];

export function LandingFooter() {
  return (
    <footer id="contacto" className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-xl font-bold text-foreground">
            Dale<span className="text-brand-secondary">Venta</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">Vende, cobra y controla tu negocio fácil.</p>
        </div>

        <div>
          <p className="font-display text-sm font-semibold text-foreground">Navegación</p>
          <ul className="mt-3 flex flex-col gap-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-display text-sm font-semibold text-foreground">Contacto</p>
          <ul className="mt-3 flex flex-col gap-2">
            <li>
              <a
                href={whatsappLink(DEMO_WHATSAPP_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </li>
            <li>
              <a href="mailto:hola@daleventa.do" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <Mail className="h-4 w-4" /> hola@daleventa.do
              </a>
            </li>
            <li>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Iniciar sesión
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} DaleVenta. Todos los derechos reservados.
      </div>
    </footer>
  );
}
