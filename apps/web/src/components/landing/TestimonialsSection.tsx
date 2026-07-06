import { Cake } from "lucide-react";
import { SectionHeading } from "@/components/landing/shared/SectionHeading";
import { Card, CardContent } from "@/components/ui/card";

export function TestimonialsSection() {
  return (
    <section className="bg-secondary/40 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Casos de uso" title="Negocios reales, empezando a controlar mejor." />
        <Card className="mt-10">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Cake className="h-6 w-6" />
            </div>
            <p className="max-w-xl text-base text-muted-foreground">
              DaleVenta está siendo implementado con negocios locales, comenzando por una repostería dominicana.
              Próximamente compartiremos testimonios reales de nuestros clientes.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
