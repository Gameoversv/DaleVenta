import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/landing";

interface PricingCardProps {
  name: string;
  description: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}

export function PricingCard({ name, description, price, features, highlighted }: PricingCardProps) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col",
        highlighted && "border-primary shadow-[var(--shadow-elevated)] ring-2 ring-primary/20"
      )}
    >
      <CardContent className="flex h-full flex-col gap-5 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-foreground">{name}</h3>
          {highlighted && <Badge variant="accent">Más popular</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="font-display text-3xl font-bold text-foreground">
          {price}
          <span className="text-sm font-normal text-muted-foreground">/mes</span>
        </p>
        <ul className="flex flex-1 flex-col gap-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              {feature}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2">
          <Button asChild variant={highlighted ? "default" : "outline"} size="lg">
            <Link href="/register">Solicitar demo</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={whatsappLink(`Hola, quiero más información sobre el plan ${name} de DaleVenta.`)} target="_blank" rel="noopener noreferrer">
              Hablar por WhatsApp
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
