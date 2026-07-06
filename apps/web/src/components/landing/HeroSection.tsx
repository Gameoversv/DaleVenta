import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardMockup } from "@/components/landing/shared/DashboardMockup";
import { POSMockup } from "@/components/landing/shared/POSMockup";
import { whatsappLink, DEMO_WHATSAPP_MESSAGE } from "@/lib/landing";

export function HeroSection() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-primary/10 via-brand-secondary/5 to-transparent" />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:py-28">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="secondary" className="px-3 py-1 text-xs">
            Hecho para negocios dominicanos
          </Badge>
          <h1 className="font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
            Controla tus ventas, caja e inventario desde un solo lugar.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            DaleVenta es un sistema fácil de usar para vender, cobrar, manejar inventario, controlar créditos y cuadrar la
            caja de tu negocio sin complicaciones.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                Solicitar demo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={whatsappLink(DEMO_WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer">
                Ver cómo funciona
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Ya usado por reposterías, panaderías, cafeterías y colmados en República Dominicana.
          </p>
        </div>

        <div className="relative flex flex-col items-center gap-6 lg:items-end">
          <DashboardMockup />
          <div className="lg:-ml-16">
            <POSMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
