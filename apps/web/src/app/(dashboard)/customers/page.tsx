"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Pencil, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { CustomerCreditPanel } from "@/components/customers/CustomerCreditPanel";
import { CustomerPurchaseHistoryDialog } from "@/components/customers/CustomerPurchaseHistoryDialog";
import type { CustomerResponse } from "@/types/customer";

async function fetchCustomers(q: string): Promise<CustomerResponse[]> {
  const res = await api.get<{ data: CustomerResponse[] }>("/api/customers", { params: { q, size: 100 } });
  return res.data.data;
}

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const canCreate = usePermission("CUSTOMER_CREATE");
  const canEdit = usePermission("CUSTOMER_EDIT");
  const canReceivePayment = usePermission("CREDIT_RECEIVE_PAYMENT");
  const canManageCredit = canEdit || canReceivePayment;

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", query],
    queryFn: () => fetchCustomers(query),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
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
      </div>
      <Input placeholder="Buscar cliente..." value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
      {isLoading && <p className="text-muted-foreground">Cargando clientes...</p>}
      {customers && customers.length === 0 && <p className="text-muted-foreground">No hay clientes todavia.</p>}
      {customers && customers.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2">Nombre</th>
              <th className="py-2">Telefono</th>
              <th className="py-2">Documento</th>
              <th className="py-2">Credito</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-border">
                <td className="py-2">{customer.fullName}</td>
                <td className="py-2">{customer.phone ?? "—"}</td>
                <td className="py-2">{customer.documentId ?? "—"}</td>
                <td className="py-2">
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
                    <CustomerPurchaseHistoryDialog
                      customer={customer}
                      trigger={
                        <Button variant="ghost" size="sm" aria-label={`Historial de ${customer.fullName}`}>
                          <History className="h-4 w-4" />
                          Compras
                        </Button>
                      }
                    />
                  </div>
                </td>
                <td className="py-2 text-right">
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
      )}
    </div>
  );
}
