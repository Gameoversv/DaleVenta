import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DenominationResponse } from "@/types/cash-shift";

async function fetchDenominations(): Promise<DenominationResponse[]> {
  const res = await api.get<{ data: DenominationResponse[] }>("/api/denominations");
  return res.data.data;
}

/**
 * The cash denominations the tenant counts with.
 *
 * The counting grid and the screen around it both need the list, and both used to declare their
 * own copy of the fetch against the same cache key. React Query then ran whichever registered
 * first and silently dropped the other, so one of the two fetchers was always dead code.
 */
export function useDenominations(enabled = true) {
  return useQuery({ queryKey: ["denominations"], queryFn: fetchDenominations, enabled });
}
