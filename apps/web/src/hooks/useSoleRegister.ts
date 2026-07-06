import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { RegisterResponse } from "@/types/branch";

async function fetchRegisters(branchId: string): Promise<RegisterResponse[]> {
  const res = await api.get<{ data: RegisterResponse[] }>("/api/registers", { params: { branchId } });
  return res.data.data;
}

/**
 * Mirrors useSoleBranch: most branches operate a single register/caja, so
 * auto-select it and skip the "which caja" step. Falls back to manual
 * selection for the rare branch with more than one register.
 */
export function useSoleRegister(branchId: string) {
  const { data: registers, isLoading, isError } = useQuery({
    queryKey: ["registers", branchId],
    queryFn: () => fetchRegisters(branchId),
    enabled: !!branchId,
  });
  const hasMultiple = (registers?.length ?? 0) > 1;
  const soleRegisterId = !hasMultiple ? registers?.[0]?.id ?? "" : "";

  return { registers: registers ?? [], isLoading, isError, hasMultiple, soleRegisterId };
}
