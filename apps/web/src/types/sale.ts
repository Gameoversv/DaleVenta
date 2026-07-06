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
  invoiceNumber: string;
  customerId: string | null;
  status: SaleStatus;
  subtotal: string;
  taxTotal: string;
  discountAmount: string;
  total: string;
  createdAt: string;
  voidedAt: string | null;
  voidReason: string | null;
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

export interface InvoiceCustomerInfo {
  name: string;
  documentId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface InvoiceItemResponse {
  productName: string;
  quantity: number;
  unitPrice: string;
  taxRate: string;
  lineTotal: string;
}

export interface InvoiceBusinessInfo {
  name: string;
  rnc: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  logoUrl: string | null;
  footerMessage: string | null;
  printSize: "LETTER" | "THERMAL_80MM" | "THERMAL_58MM";
  showLogo: boolean;
  showRnc: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showAddress: boolean;
  showCustomer: boolean;
  showTax: boolean;
}

export interface InvoiceResponse {
  id: string;
  invoiceNumber: string;
  status: SaleStatus;
  createdAt: string;
  business: InvoiceBusinessInfo;
  branchName: string;
  registerName: string;
  customer: InvoiceCustomerInfo | null;
  subtotal: string;
  taxTotal: string;
  discountAmount: string;
  total: string;
  items: InvoiceItemResponse[];
  payments: PaymentResponse[];
}
