export interface CreditProfileResponse {
  customerId: string;
  creditEnabled: boolean;
  creditLimit: string;
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
}

export interface UpdateCreditProfileRequest {
  creditEnabled: boolean;
  creditLimit: string;
}

export interface RecordCreditPaymentRequest {
  amount: string;
  note?: string;
}
