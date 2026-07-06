import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, align = "center", className }: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      {eyebrow && (
        <span className="rounded-full bg-brand-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-secondary">
          {eyebrow}
        </span>
      )}
      <h2 className="max-w-2xl font-display text-3xl font-bold text-foreground sm:text-4xl">{title}</h2>
      {description && <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">{description}</p>}
    </div>
  );
}
