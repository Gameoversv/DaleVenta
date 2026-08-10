"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useAnyPermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvoiceResponse } from "@/types/sale";
import { PermissionDenied } from "@/components/common/permission-denied";
import { ErrorState } from "@/components/common/empty-state";
import { InvoiceDocument, invoiceWidth } from "@/components/invoice/invoice-document";

async function fetchInvoice(id: string): Promise<InvoiceResponse> {
  const res = await api.get<{ data: InvoiceResponse }>(`/api/sales/${id}/invoice`);
  return res.data.data;
}

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const canView = useAnyPermission("SALE_VIEW_HISTORY", "SALE_CREATE");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoice", params.id],
    queryFn: () => fetchInvoice(params.id),
    enabled: canView && !!params.id,
  });

  if (!canView) {
    return <PermissionDenied title="Factura" message="Tu usuario no tiene permiso para ver facturas." />;
  }

  return (
    <div className={cn("mx-auto space-y-4 print:space-y-0", data ? invoiceWidth(data.business.printSize) : "max-w-3xl")}>
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="outline">
          <Link href="/sales">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
        <Button onClick={() => window.print()} disabled={!data}>
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground print:hidden">Cargando factura...</p>}
      {isError && <ErrorState message="No se pudo cargar la factura." className="print:hidden" />}

      {data && <InvoiceDocument data={data} />}
    </div>
  );
}
