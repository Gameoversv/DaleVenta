"use client";

import { createContext, useContext, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import api from "@/lib/api";
import type { AuthResponse, MeResponse, PermissionCode, TenantFeatures, UserResponse } from "@/types/auth";

/** Exported for testing: the first page a user can actually open after signing in. */
export function landingPageFor(user: UserResponse | undefined, permissions: PermissionCode[]): string {
  if (user?.role === "SUPER_ADMIN") return "/super-admin";
  if (permissions.includes("DASHBOARD_VIEW")) return "/dashboard";
  if (permissions.includes("SALE_CREATE")) return "/pos";
  if (permissions.includes("CASHSHIFT_OPEN")) return "/cash-shift";
  return "/customers";
}

interface AuthContextValue {
  user: UserResponse | null;
  permissions: PermissionCode[];
  tenantFeatures: TenantFeatures;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * What a signed-out or not-yet-loaded session may assume.
 *
 * Cash denominations default on because a register that stops asking for a count silently changes
 * how money is handled; the other modules are sold, so their absence is the safe answer.
 */
const DEFAULT_TENANT_FEATURES: TenantFeatures = {
  fiscalModuleEnabled: false,
  cashDenominationsEnabled: true,
  multiBranchEnabled: false,
  multiRegisterEnabled: false,
  rentalModuleEnabled: false,
  purchaseModuleEnabled: false,
};

async function fetchMe(): Promise<MeResponse | null> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return null;
  try {
    const res = await api.get<{ data: MeResponse }>("/api/auth/me");
    return res.data.data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      return null;
    }
    throw err;
  }
}

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const isPublicAuthPage = pathname === "/login" || pathname === "/register";

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: !isPublicAuthPage,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ data: AuthResponse }>("/api/auth/login", { email, password });
      localStorage.setItem("token", res.data.data.token);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      const me = await queryClient.fetchQuery({ queryKey: ["me"], queryFn: fetchMe });
      router.push(landingPageFor(me?.user, me?.permissions ?? []));
    },
    [queryClient, router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    queryClient.setQueryData(["me"], null);
    router.push("/login");
  }, [queryClient, router]);

  // Rebuilding this object on every render would re-render every consumer of the context, which
  // is most of the app: the sidebar, every permission check, every screen that reads the tenant.
  const value = useMemo<AuthContextValue>(
    () => ({
      user: data?.user ?? null,
      permissions: data?.permissions ?? [],
      tenantFeatures: data?.tenantFeatures ?? DEFAULT_TENANT_FEATURES,
      isLoading,
      login,
      logout,
    }),
    [data, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
