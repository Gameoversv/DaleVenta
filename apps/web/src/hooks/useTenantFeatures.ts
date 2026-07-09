import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { TenantFeatures } from "@/types/auth";

async function fetchTenantFeatures(): Promise<TenantFeatures> {
  const res = await api.get<{ data: TenantFeatures }>("/api/fiscal/status");
  return res.data.data;
}

export function useTenantFeatures(): TenantFeatures {
  const { tenantFeatures, user } = useAuth();
  const { data } = useQuery({
    queryKey: ["tenant-features"],
    queryFn: fetchTenantFeatures,
    enabled: !!user && user.role !== "SUPER_ADMIN",
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false,
  });

  return data ?? tenantFeatures;
}
