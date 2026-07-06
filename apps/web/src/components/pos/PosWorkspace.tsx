"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <Wallet className="h-6 w-6 text-warning" />
          </div>
          <div className="space-y-1">
            <p className="font-display text-base font-semibold">Turno de caja cerrado</p>
            <p className="text-sm text-muted-foreground">
              Debes abrir una caja antes de iniciar ventas.
            </p>
          </div>
          <Button asChild className="mt-2">
            <Link href="/cash-shift">Abrir turno</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <SaleWorkspace registerId={registerId} cashShiftId={currentShift.id} />;
}
