export type RentalContractStatus = "ACTIVE" | "RETURNED" | "CANCELLED";

export interface RentalContractItemResponse {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
}

export interface RentalContractResponse {
  id: string;
  contractNumber: string;
  saleId: string;
  customerId: string;
  customerName: string;
  status: RentalContractStatus;
  expectedReturnAt: string;
  returnedAt: string | null;
  depositAmount: string;
  notes: string | null;
  createdAt: string;
  items: RentalContractItemResponse[];
}
