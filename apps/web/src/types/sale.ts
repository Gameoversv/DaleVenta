import type { DenominationCountEntry } from "./cash-shift";

export type SaleStatus = "COMPLETED" | "VOIDED";
export type PaymentMethod = "CASH" | "TRANSFER" | "CREDIT";

export interface SaleItemRequest {
  productId: string;
  quantity: number;
  useWholesalePrice: boolean;
}

export interface PaymentRequest {
  method: PaymentMethod;
  amount: string;
  receivedDenominations?: DenominationCountEntry[];
  bank?: string;
  reference?: string;
}

export interface CreateSaleRequest {
  registerId: string;
  cashShiftId: string;
  customerId?: string | null;
  discountAmount?: string;
  items: SaleItemRequest[];
  payments: PaymentRequest[];
}

export interface SaleItemResponse {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  taxRate: string;
  lineTotal: string;
}

export interface PaymentResponse {
  id: string;
  method: PaymentMethod;
  amount: string;
}

export interface SaleResponse {
  id: string;
  customerId: string | null;
  status: SaleStatus;
  subtotal: string;
  taxTotal: string;
  discountAmount: string;
  total: string;
  items: SaleItemResponse[];
  payments: PaymentResponse[];
}

export interface VoidSaleRequest {
  voidReason: string;
}

export interface ChangeSuggestionRequest {
  registerId: string;
  changeAmountCents: number;
  receivedDenominations: DenominationCountEntry[];
}

export interface ChangeSuggestionResponse {
  exact: boolean;
  combination: DenominationCountEntry[];
}
