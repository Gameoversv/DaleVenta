import { useAuth } from "@/lib/auth-context";
import type { PermissionCode } from "@/types/auth";

export function usePermission(code: PermissionCode): boolean {
  const { permissions, user } = useAuth();
  return user?.role === "ADMIN" || permissions.includes(code);
}
