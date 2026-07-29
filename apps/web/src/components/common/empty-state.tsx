import * as React from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** What is missing, written for the screen it appears on. */
  message: React.ReactNode;
  /** Optional call to action: a button or dialog trigger that fills the gap. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * "Nothing here yet" copy. Callers pass their own padding through `className` because these land
 * both loose on the page and inside a `CardContent` that already sets its own.
 */
export function EmptyState({ message, action, className }: EmptyStateProps) {
  return (
    <div className={cn("space-y-3 text-sm text-muted-foreground", className)}>
      <p>{message}</p>
      {action}
    </div>
  );
}

export interface ErrorStateProps {
  /** User-facing failure copy. Never surface the raw API error here. */
  message: React.ReactNode;
  /** Optional retry control. */
  action?: React.ReactNode;
  className?: string;
}

/** A failed load, styled apart from an empty one so the two are not read as the same outcome. */
export function ErrorState({ message, action, className }: ErrorStateProps) {
  return (
    <div className={cn("space-y-3 text-sm text-destructive", className)} role="alert">
      <p>{message}</p>
      {action}
    </div>
  );
}
