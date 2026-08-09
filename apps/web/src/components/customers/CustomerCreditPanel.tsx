"use client";

import type React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";
import type { CustomerResponse } from "@/types/customer";
import type {
  CreditAccountResponse,
  CreditInvoiceRow,
  CreditProfileResponse,
  CreditTransactionResponse,
} from "@/types/credit";
import { CreditBalanceCard } from "./credit/CreditBalanceCard";
import { CreditHistorySection } from "./credit/CreditHistorySection";
import { CreditProfileSection } from "./credit/CreditProfileSection";
import { OutstandingInvoicesTable } from "./credit/OutstandingInvoicesTable";
import { RecordPaymentForm } from "./credit/RecordPaymentForm";

async function fetchProfile(customerId: string): Promise<CreditProfileResponse> {
  const res = await api.get<{ data: CreditProfileResponse }>(`/api/customers/${customerId}/credit-profile`);
  return res.data.data;
}

async function fetchAccount(customerId: string): Promise<CreditAccountResponse> {
  const res = await api.get<{ data: CreditAccountResponse }>(`/api/customers/${customerId}/credit-account`);
  return res.data.data;
}

async function fetchTransactions(customerId: string): Promise<CreditTransactionResponse[]> {
  const res = await api.get<{ data: CreditTransactionResponse[] }>(`/api/customers/${customerId}/credit-transactions`);
  return res.data.data;
}

async function fetchInvoices(customerId: string): Promise<CreditInvoiceRow[]> {
  const res = await api.get<{ data: CreditInvoiceRow[] }>(`/api/customers/${customerId}/credit-invoices`);
  return res.data.data;
}

interface CustomerCreditPanelProps {
  customer: CustomerResponse;
  trigger: React.ReactNode;
}

/** Which invoice the payment form should open on, and how many times it has been pointed there. */
interface PaymentPrefill {
  saleId: string;
  amount: string;
  /** Bumped on every click so picking the same invoice twice still resets the form. */
  seq: number;
}

const NO_PREFILL: PaymentPrefill = { saleId: "", amount: "", seq: 0 };

/**
 * Everything about one customer's credit: the terms, what they owe, and taking money against it.
 *
 * The sections own their own writes. What is left here is the reading — four queries that only run
 * once the dialog is open — plus which invoice the payment form should start on.
 */
export function CustomerCreditPanel({ customer, trigger }: Readonly<CustomerCreditPanelProps>) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<PaymentPrefill>(NO_PREFILL);
  const canAuthorize = usePermission("CREDIT_AUTHORIZE");
  const canViewCredit = usePermission("CUSTOMER_EDIT");
  const canReceivePayment = usePermission("CREDIT_RECEIVE_PAYMENT");

  const enabled = open && canViewCredit;
  const { data: profile } = useQuery({
    queryKey: ["credit-profile", customer.id],
    queryFn: () => fetchProfile(customer.id),
    enabled,
  });
  const { data: account } = useQuery({
    queryKey: ["credit-account", customer.id],
    queryFn: () => fetchAccount(customer.id),
    enabled,
  });
  const { data: transactions } = useQuery({
    queryKey: ["credit-transactions", customer.id],
    queryFn: () => fetchTransactions(customer.id),
    enabled,
  });
  const { data: invoices } = useQuery({
    queryKey: ["credit-invoices", customer.id],
    queryFn: () => fetchInvoices(customer.id),
    enabled,
  });

  const outstanding = invoices ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Credito de {customer.fullName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <CreditProfileSection customerId={customer.id} profile={profile} canAuthorize={canAuthorize} />

          {canViewCredit && <CreditBalanceCard account={account} profile={profile} />}

          {canViewCredit && outstanding.length > 0 && (
            <OutstandingInvoicesTable
              invoices={outstanding}
              canReceivePayment={canReceivePayment}
              onPayInvoice={(invoice) =>
                setPrefill((current) => ({
                  saleId: invoice.saleId,
                  amount: invoice.outstanding,
                  seq: current.seq + 1,
                }))
              }
            />
          )}

          {canReceivePayment && (
            <RecordPaymentForm
              key={prefill.seq}
              customerId={customer.id}
              invoices={outstanding}
              initialSaleId={prefill.saleId}
              initialAmount={prefill.amount}
            />
          )}

          {canViewCredit && <CreditHistorySection transactions={transactions} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
