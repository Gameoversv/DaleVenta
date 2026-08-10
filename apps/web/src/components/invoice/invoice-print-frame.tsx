"use client";

import { useCallback, useState, type CSSProperties } from "react";

/**
 * Fuera de pantalla, no oculto: un iframe con display:none no renderiza y sale
 * una hoja en blanco. El ancho es el de una hoja carta porque el documento se
 * mide con container queries; la tirilla se limita sola dentro.
 */
const FRAME_STYLE: CSSProperties = {
  position: "fixed",
  left: "-10000px",
  top: 0,
  width: "210mm",
  height: "297mm",
  border: 0,
};

interface InvoicePrintFrameProps {
  saleId: string;
  /** Cada numero nuevo recarga el iframe; 0 significa que no hay nada que imprimir. */
  job: number;
}

/**
 * Carga la factura imprimible de una venta y la manda a la impresora sola.
 *
 * La ruta /print/sales/[id] se dibuja sin barra lateral ni botones y se imprime
 * al terminar de cargar, asi que el cajero no navega ni busca la venta.
 */
export function InvoicePrintFrame({ saleId, job }: Readonly<InvoicePrintFrameProps>) {
  if (job <= 0) return null;

  return (
    <iframe
      // Remontar el iframe es lo que vuelve a disparar la impresion.
      key={`${saleId}-${job}`}
      title="Factura para imprimir"
      src={`/print/sales/${saleId}`}
      style={FRAME_STYLE}
      aria-hidden
      tabIndex={-1}
      data-job={job}
      data-testid="invoice-print-frame"
    />
  );
}

/**
 * Da a cualquier pantalla la posibilidad de imprimir una factura sin navegar.
 *
 * Devuelve la funcion que dispara la impresion y el iframe que hay que montar.
 * `autoFor` imprime esa venta apenas se monta el componente: es lo que hace
 * automatica la impresion al cerrar una venta en el POS.
 */
export function useInvoicePrinter(autoFor?: string | null) {
  const [target, setTarget] = useState<{ saleId: string; job: number } | null>(
    autoFor ? { saleId: autoFor, job: 1 } : null
  );

  const printInvoice = useCallback((saleId: string) => {
    setTarget((current) =>
      current?.saleId === saleId ? { saleId, job: current.job + 1 } : { saleId, job: 1 }
    );
  }, []);

  const frame = target ? <InvoicePrintFrame saleId={target.saleId} job={target.job} /> : null;

  return { printInvoice, frame };
}
