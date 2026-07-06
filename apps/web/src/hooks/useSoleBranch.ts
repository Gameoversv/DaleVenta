import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { BranchResponse } from "@/types/branch";

async function fetchBranches(): Promise<BranchResponse[]> {
  const res = await api.get<{ data: BranchResponse[] }>("/api/branches");
  return res.data.data;
}

/**
 * Most tenants operate a single branch (one login = one business location;
 * a second location means registering a separate tenant). This hook auto-
 * selects that branch so pages skip the "which sucursal" step, while still
 * falling back to manual selection for the rare tenant with more than one.
 */
export function useSoleBranch(enabled = true) {
  const { data: branches, isLoading, isError } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    enabled,
  });
  const hasMultiple = (branches?.length ?? 0) > 1;
  const soleBranchId = !hasMultiple ? branches?.[0]?.id ?? "" : "";

  return { branches: branches ?? [], isLoading, isError, hasMultiple, soleBranchId };
}
