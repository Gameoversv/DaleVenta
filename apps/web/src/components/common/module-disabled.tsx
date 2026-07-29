import { PageHeader } from "@/components/common/page-header";

export interface ModuleDisabledProps {
  /** Page title, so the screen still identifies itself. */
  title: string;
  /** Why the screen is unavailable. Defaults to the plain tenant-feature wording. */
  message?: string;
}

/**
 * Shown when a screen belongs to an optional module the tenant has not enabled.
 *
 * Kept apart from {@link PermissionDenied} on purpose: "your plan does not include this" and
 * "your user is not allowed this" are different answers, and collapsing them would tell an admin
 * to go fix permissions that were never the problem.
 */
export function ModuleDisabled({ title, message = "Este modulo no esta activo para este tenant." }: ModuleDisabledProps) {
  return (
    <div className="space-y-2">
      <PageHeader title={title} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
