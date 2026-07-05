import { useAuth } from "@/lib/auth-context";
import type { PermissionCode } from "@/types/auth";

export function usePermission(code: PermissionCode): boolean {
  const { permissions } = useAuth();
  return permissions.includes(code);
}
