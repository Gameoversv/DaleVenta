"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaleWorkspace } from "./SaleWorkspace";
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

export function PosWorkspace({ registerId }: { registerId: string }) {
  const { data: currentShift, isLoading } = useQuery({
    queryKey: ["cash-shift-current", registerId],
    queryFn: () => fetchCurrentShift(registerId),
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando turno...</p>;
  }

  if (!currentShift) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No hay turno abierto en esta caja</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/cash-shift" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Abrir turno
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <SaleWorkspace registerId={registerId} cashShiftId={currentShift.id} />;
}
