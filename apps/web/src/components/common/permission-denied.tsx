import { PageHeader } from "@/components/common/page-header";

export interface PermissionDeniedProps {
  /** Page title, kept so the user still knows which screen refused them. */
  title: string;
  /** What the viewer is missing, phrased for the screen they landed on. */
  message: string;
}

/**
 * Shown in place of a page when the viewer lacks the permission it requires.
 *
 * The gate itself stays in the page (it decides which permission matters); this only renders the
 * refusal, so the wording and layout cannot drift across the fourteen screens that need it.
 */
export function PermissionDenied({ title, message }: PermissionDeniedProps) {
  return (
    <div className="space-y-2">
      <PageHeader title={title} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
