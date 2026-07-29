import * as React from "react";

import { cn } from "@/lib/utils";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  /** Optional supporting line under the title. */
  description?: React.ReactNode;
  /** Actions rendered opposite the title: buttons, dialog triggers, filters. */
  actions?: React.ReactNode;
  /**
   * How the actions line up with the title on wide viewports. Use "end" when the actions are
   * labelled form controls, so their inputs sit on the title baseline instead of its center.
   */
  align?: "center" | "end";
}

/**
 * The single page title treatment. Pages used to hand-roll this, which is how three competing
 * styles (`text-2xl font-semibold`, `font-display font-bold`, and the same plus `tracking-tight`)
 * ended up shipping side by side — several of them inside one file.
 */
export function PageHeader({ title, description, actions, align = "center", className, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:justify-between",
        align === "end" ? "sm:items-end" : "sm:items-center",
        className
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {/* `items-end` so a labelled control and a bare button in the same row share a baseline. */}
      {actions && <div className="flex shrink-0 flex-wrap items-end gap-2">{actions}</div>}
    </div>
  );
}
