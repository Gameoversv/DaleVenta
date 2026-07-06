export interface CreditProfileResponse {
  customerId: string;
  creditEnabled: boolean;
  creditLimit: string | null;
}

export interface CreditAccountResponse {
  customerId: string;
  balance: string;
}

export type CreditTransactionType = "CHARGE" | "PAYMENT";

export interface CreditTransactionResponse {
  id: string;
  type: CreditTransactionType;
  amount: string;
  saleId: string | null;
  note: string | null;
  payerName: string | null;
}

export interface UpdateCreditProfileRequest {
  creditEnabled: boolean;
  creditLimit: string | null;
}

export interface RecordCreditPaymentRequest {
  amount: string;
  note?: string;
  saleId?: string;
  payerName?: string;
}

export interface CreditInvoiceRow {
  saleId: string;
  createdAt: string;
  chargeAmount: string;
  paidAmount: string;
  outstanding: string;
}

export interface AccountsReceivableRow {
  customerId: string;
  customerName: string;
  phone: string | null;
  balance: string;
  creditLimit: string | null;
}
