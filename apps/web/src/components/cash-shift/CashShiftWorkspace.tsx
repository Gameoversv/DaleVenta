"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { OpenShiftForm } from "./OpenShiftForm";
import { ShiftSummary } from "./ShiftSummary";
import type { CashShiftSummaryResponse } from "@/types/cash-shift";

async function fetchCurrentShift(registerId: string): Promise<CashShiftSummaryResponse | null> {
  try {
    const res = await api.get<{ data: CashShiftSummaryResponse }>("/api/cash-shifts/current", {
      params: { registerId },
    });
    return res.data.data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export function CashShiftWorkspace({ registerId }: { registerId: string }) {
  const { data: currentShift, isLoading } = useQuery({
    queryKey: ["cash-shift-current", registerId],
    queryFn: () => fetchCurrentShift(registerId),
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando turno...</p>;
  }
  if (!currentShift) {
    return <OpenShiftForm registerId={registerId} />;
  }
  return (
    <ShiftSummary shift={currentShift} registerId={registerId} onRequestClose={() => {}} />
  );
}
