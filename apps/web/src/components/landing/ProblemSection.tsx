import { AlertTriangle, PackageSearch, Users, UserCog, NotebookPen, LayoutGrid } from "lucide-react";
import { SectionHeading } from "@/components/landing/shared/SectionHeading";
import { Card, CardContent } from "@/components/ui/card";

const PROBLEMS = [
  { icon: AlertTriangle, text: "La caja no cuadra al final del día." },
  { icon: PackageSearch, text: "No sabes qué productos se están agotando." },
  { icon: Users, text: "Pierdes control de clientes que compran a crédito." },
  { icon: UserCog, text: "No sabes cuánto vendió cada cajero." },
  { icon: NotebookPen, text: "Usas libretas o Excel para controlar todo." },
  { icon: LayoutGrid, text: "Es difícil revisar ventas, inventario y deudas en un solo lugar." },
];

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        eyebrow="El problema"
        title="¿Tu negocio vende, pero no siempre sabes qué está pasando?"
        description="No vendas a ciegas. Estos son los dolores de cabeza más comunes en pequeños negocios."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROBLEMS.map((problem) => (
          <Card key={problem.text} className="border-destructive/15 bg-destructive/[0.03]">
            <CardContent className="flex items-start gap-3 p-5">
              <problem.icon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <p className="text-sm font-medium text-foreground">{problem.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
