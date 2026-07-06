"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { OpenShiftForm } from "./OpenShiftForm";
import { ShiftSummary } from "./ShiftSummary";
import { CloseShiftForm } from "./CloseShiftForm";
import { FinalShiftSummary } from "./FinalShiftSummary";
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

function errorMessage(error: unknown): string {
  return (
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    "No se pudo cargar el turno de esta caja."
  );
}

export function CashShiftWorkspace({ registerId }: { registerId: string }) {
  const queryClient = useQueryClient();
  const [closing, setClosing] = useState(false);
  const [closedShift, setClosedShift] = useState<CashShiftSummaryResponse | null>(null);

  const { data: currentShift, error, isError, isLoading } = useQuery({
    queryKey: ["cash-shift-current", registerId],
    queryFn: () => fetchCurrentShift(registerId),
    enabled: !closedShift,
  });

  if (closedShift) {
    return (
      <FinalShiftSummary
        shift={closedShift}
        onDone={() => {
          setClosedShift(null);
          queryClient.invalidateQueries({ queryKey: ["cash-shift-current", registerId] });
        }}
      />
    );
  }
  if (isLoading) {
    return <p className="text-muted-foreground">Cargando turno...</p>;
  }
  if (isError) {
    return <p className="text-sm text-destructive">{errorMessage(error)}</p>;
  }
  if (!currentShift) {
    return <OpenShiftForm registerId={registerId} />;
  }
  if (closing) {
    return (
      <CloseShiftForm
        shift={currentShift}
        onCancel={() => setClosing(false)}
        onClosed={(closed) => {
          setClosing(false);
          setClosedShift(closed);
        }}
      />
    );
  }
  return <ShiftSummary shift={currentShift} registerId={registerId} onRequestClose={() => setClosing(true)} />;
}
