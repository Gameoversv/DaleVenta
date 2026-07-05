"use client";

import { createContext, useContext, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { AuthResponse, MeResponse, PermissionCode, UserResponse } from "@/types/auth";

interface AuthContextValue {
  user: UserResponse | null;
  permissions: PermissionCode[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<MeResponse | null> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return null;
  const res = await api.get<{ data: MeResponse }>("/api/auth/me");
  return res.data.data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: Infinity,
    retry: false,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ data: AuthResponse }>("/api/auth/login", { email, password });
      localStorage.setItem("token", res.data.data.token);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      router.push("/dashboard");
    },
    [queryClient, router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    queryClient.setQueryData(["me"], null);
    router.push("/login");
  }, [queryClient, router]);

  return (
    <AuthContext.Provider
      value={{
        user: data?.user ?? null,
        permissions: data?.permissions ?? [],
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
