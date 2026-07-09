export type QuotationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

export interface QuotationItemRequest {
  productId: string;
  quantity: number;
  useWholesalePrice: boolean;
}

export interface CreateQuotationRequest {
  customerId?: string | null;
  validUntil?: string | null;
  discountAmount?: string;
  notes?: string;
  items: QuotationItemRequest[];
}

export interface QuotationItemResponse {
  id: string;
  productId: string;
  productName: string;
  productUnit: string;
  quantity: number;
  unitPrice: string;
  taxRate: string;
  lineTotal: string;
}

export interface QuotationResponse {
  id: string;
  quotationNumber: string;
  customerId: string | null;
  customerName: string;
  status: QuotationStatus;
  validUntil: string | null;
  subtotal: string;
  taxTotal: string;
  discountAmount: string;
  total: string;
  notes: string | null;
  createdAt: string;
  items: QuotationItemResponse[];
}
