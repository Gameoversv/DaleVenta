export type PurchaseStatus = "DRAFT" | "RECEIVED" | "VOID";
export type PurchasePaymentMethod = "CASH" | "TRANSFER" | "OTHER";

export interface SupplierResponse {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxId: string | null;
  notes: string | null;
  active: boolean;
}

export interface SupplierRequest {
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxId: string | null;
  notes: string | null;
  active?: boolean;
}

export interface PurchaseItemRequest {
  productId: string;
  quantity: number;
  unitCost: string;
  taxRate: string;
  discountAmount: string;
}

export interface CreatePurchaseRequest {
  supplierId: string;
  branchId: string;
  invoiceNumber: string | null;
  purchasedAt: string | null;
  notes: string | null;
  items: PurchaseItemRequest[];
}

export interface PurchaseItemResponse {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitCost: string;
  taxRate: string;
  discountAmount: string;
  lineTotal: string;
}

export interface PurchaseResponse {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  status: PurchaseStatus;
  invoiceNumber: string | null;
  purchasedAt: string;
  receivedAt: string | null;
  notes: string | null;
  subtotal: string;
  taxTotal: string;
  discountTotal: string;
  total: string;
  paidAmount: string;
  balanceDue: string;
  items: PurchaseItemResponse[];
}

export interface RecordPurchasePaymentRequest {
  amount: string;
  method: PurchasePaymentMethod;
  paidAt: string | null;
  reference: string | null;
  notes: string | null;
}

export interface PurchasePaymentResponse {
  id: string;
  purchaseId: string;
  supplierId: string;
  method: PurchasePaymentMethod;
  amount: string;
  paidAt: string;
  reference: string | null;
  notes: string | null;
}

export interface AccountsPayableRow {
  purchaseId: string;
  purchaseNumber: string;
  invoiceNumber: string | null;
  supplierId: string;
  supplierName: string;
  purchasedAt: string;
  total: string;
  paidAmount: string;
  balanceDue: string;
}
