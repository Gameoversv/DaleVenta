import { useAuth } from "@/lib/auth-context";
import type { PermissionCode } from "@/types/auth";

export function usePermission(code: PermissionCode): boolean {
  const { permissions, user } = useAuth();
  return user?.role === "ADMIN" || permissions.includes(code);
}

/**
 * True when the user holds at least one of the codes.
 *
 * Prefer this over `usePermission(a) || usePermission(b)`: `||` short-circuits, so the second hook
 * is skipped whenever the first is true. React would then see a different number of hooks between
 * renders and start returning state from the wrong hook.
 */
export function useAnyPermission(...codes: PermissionCode[]): boolean {
  const { permissions, user } = useAuth();
  return user?.role === "ADMIN" || codes.some((code) => permissions.includes(code));
}
