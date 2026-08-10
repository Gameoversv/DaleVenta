"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign, History, Pencil, Plus, Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { CustomerCreditPanel } from "@/components/customers/CustomerCreditPanel";
import { CustomerPurchaseHistoryDialog } from "@/components/customers/CustomerPurchaseHistoryDialog";
import { PageHeader } from "@/components/common/page-header";
import { PermissionDenied } from "@/components/common/permission-denied";
import { EmptyState } from "@/components/common/empty-state";
import type { CustomerResponse } from "@/types/customer";

const PAGE_SIZE = 20;

interface CustomersPage {
  data: CustomerResponse[];
  meta: { total: number };
}

async function fetchCustomers(q: string, page: number): Promise<CustomersPage> {
  const res = await api.get<CustomersPage>("/api/customers", {
    params: { q, page, size: PAGE_SIZE },
  });
  return { data: res.data.data, meta: { total: res.data.meta?.total ?? 0 } };
}

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const canView = usePermission("CUSTOMER_VIEW");
  const canCreate = usePermission("CUSTOMER_CREATE");
  const canEdit = usePermission("CUSTOMER_EDIT");
  const canReceivePayment = usePermission("CREDIT_RECEIVE_PAYMENT");
  const canViewSalesHistory = usePermission("SALE_VIEW_HISTORY");
  const canViewReports = usePermission("REPORTS_VIEW");
  const canManageCredit = canEdit || canReceivePayment;

  const { data: result, isLoading } = useQuery({
    queryKey: ["customers", query, page],
    queryFn: () => fetchCustomers(query, page),
    enabled: canView,
    placeholderData: (previous) => previous,
  });

  const customers = result?.data;
  const total = result?.meta.total ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const desde = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const hasta = Math.min(total, page * PAGE_SIZE + (customers?.length ?? 0));

  function search(value: string) {
    setQuery(value);
    setPage(0); // Un filtro nuevo siempre arranca en la primera pagina
  }

  if (!canView) {
    return <PermissionDenied title="Clientes" message="No tienes permiso para ver clientes." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        actions={
          <>
            {canViewReports && (
              <Button variant="outline" asChild>
                <Link href="/reports/accounts-receivable">
                  <CircleDollarSign className="h-4 w-4" />
                  Cuentas por cobrar
                </Link>
              </Button>
            )}
            {canCreate && (
              <CustomerFormDialog
                trigger={
                  <Button>
                    <Plus className="h-4 w-4" />
                    Nuevo cliente
                  </Button>
                }
              />
            )}
          </>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, telefono o cedula..."
          value={query}
          onChange={(e) => search(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando clientes...</p>}
      {customers && customers.length === 0 && (
        <EmptyState
          message={
            query.trim()
              ? `Ningun cliente coincide con "${query}".`
              : "Aun no hay clientes registrados."
          }
        />
      )}
      {customers && customers.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Telefono</th>
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3"></th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{customer.fullName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{customer.phone ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{customer.documentId ?? "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {canManageCredit && (
                            <CustomerCreditPanel
                              customer={customer}
                              trigger={
                                <Button variant="ghost" size="sm">
                                  <Wallet className="h-4 w-4" />
                                  Credito
                                </Button>
                              }
                            />
                          )}
                          {canViewSalesHistory && (
                            <CustomerPurchaseHistoryDialog
                              customer={customer}
                              trigger={
                                <Button variant="ghost" size="sm" aria-label={`Historial de ${customer.fullName}`}>
                                  <History className="h-4 w-4" />
                                  Compras
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEdit && (
                          <CustomerFormDialog
                            customer={customer}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label={`Editar ${customer.fullName}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {desde}-{hasta} de {total} clientes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Pagina {page + 1} de {lastPage + 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
