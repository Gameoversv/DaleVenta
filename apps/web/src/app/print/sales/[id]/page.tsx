"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { InvoiceDocument, invoiceWidth } from "@/components/invoice/invoice-document";
import { useAutoPrint } from "@/components/invoice/use-auto-print";
import type { InvoiceResponse } from "@/types/sale";

async function fetchInvoice(id: string): Promise<InvoiceResponse> {
  const res = await api.get<{ data: InvoiceResponse }>(`/api/sales/${id}/invoice`);
  return res.data.data;
}

/**
 * La factura sola, sin barra lateral ni botones, que se imprime al cargar.
 *
 * Vive fuera de (dashboard) a proposito: lo que se imprime es esta pagina
 * entera, y el menu de la aplicacion no va en el papel. Las pantallas la cargan
 * en un iframe oculto (ver useInvoicePrinter), asi imprimir no obliga a salir
 * de donde esta el usuario.
 */
export default function PrintInvoicePage() {
  const params = useParams<{ id: string }>();
  const { data, isError } = useQuery({
    queryKey: ["invoice", params.id],
    queryFn: () => fetchInvoice(params.id),
    enabled: !!params.id,
  });

  useAutoPrint(!!data);

  if (isError) {
    return <p className="p-6 text-sm">No se pudo cargar la factura.</p>;
  }

  if (!data) {
    return <p className="p-6 text-sm">Cargando factura...</p>;
  }

  return (
    <div data-testid="print-invoice-paper" className={cn("mx-auto", invoiceWidth(data.business.printSize))}>
      <InvoiceDocument data={data} />
    </div>
  );
}
