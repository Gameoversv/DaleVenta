import Link from "next/link";
import { Button } from "@/components/ui/button";
import { whatsappLink, DEMO_WHATSAPP_MESSAGE } from "@/lib/landing";

export function FinalCTASection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
        <h2 className="max-w-2xl font-display text-3xl font-bold sm:text-4xl">
          Empieza a controlar tu negocio con DaleVenta.
        </h2>
        <p className="max-w-xl text-primary-foreground/80">
          Vende más organizado, cuadra mejor tu caja y toma decisiones con información real.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="accent">
            <Link href="/register">Solicitar demo</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
            <a href={whatsappLink(DEMO_WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer">
              Hablar por WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
