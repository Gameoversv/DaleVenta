"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CashShiftSummaryResponse } from "@/types/cash-shift";

export function FinalShiftSummary({
  shift,
  onDone,
}: {
  shift: CashShiftSummaryResponse;
  onDone: () => void;
}) {
  const difference = Number(shift.cashDifference ?? "0");
  const isExact = difference === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Turno cerrado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Efectivo esperado</p>
            <p className="font-medium">RD${shift.expectedCash}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Efectivo contado</p>
            <p className="font-medium">RD${shift.countedCash}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Diferencia</p>
            <p className={cn("font-medium", isExact ? "text-emerald-600" : "text-amber-600")}>
              RD${shift.cashDifference}
            </p>
          </div>
        </div>
        <Button onClick={onDone}>Volver</Button>
      </CardContent>
    </Card>
  );
}
