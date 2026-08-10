"use client";

import { FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { InvoiceDocument, invoiceWidth } from "./invoice-document";
import { buildSampleInvoice } from "./sample-invoice";
import type { InvoiceSettingsResponse } from "@/types/settings";

const PRINT_SIZE_LABEL: Record<InvoiceSettingsResponse["printSize"], string> = {
  LETTER: "Hoja carta",
  THERMAL_80MM: "Tirilla 80mm",
  THERMAL_58MM: "Tirilla 58mm",
};

/**
 * Muestra como saldria la factura con la configuracion que se esta editando,
 * sin tener que guardar ni imprimir una venta real.
 *
 * Recibe los valores del formulario en curso, no los guardados: la idea es
 * ver el efecto de cada interruptor antes de confirmarlo.
 */
export function InvoicePreviewDialog({ settings }: Readonly<{ settings: InvoiceSettingsResponse }>) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <FileSearch className="h-4 w-4" />
          Ver ejemplo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Ejemplo de factura &mdash; {PRINT_SIZE_LABEL[settings.printSize]}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Venta de ejemplo con los datos que tienes en pantalla. Los cambios se ven aqui aunque
          todavia no hayas guardado.
        </p>
        {/* El ancho real del papel: una tirilla no se dibuja del ancho del dialogo. */}
        <div className={cn("mx-auto w-full", invoiceWidth(settings.printSize))}>
          <InvoiceDocument data={buildSampleInvoice(settings)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
