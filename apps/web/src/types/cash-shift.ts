export interface DenominationResponse {
  id: string;
  value: string;
  type: "BILL" | "COIN";
  active: boolean;
}

export interface DenominationCountEntry {
  denominationId: string;
  quantity: number;
}

export type CashShiftStatus = "OPEN" | "CLOSED";

export interface CashShiftDenominationEntry {
  denominationId: string;
  openingQuantity: number;
  currentQuantity: number;
  closingQuantity: number | null;
}

export interface InventoryCountEntry {
  productId: string;
  quantity: number;
}

export interface ShiftInventoryCountEntry {
  productId: string;
  openingQuantity: number;
  closingQuantity: number | null;
  expectedQuantity: number | null;
}

export interface CashShiftSummaryResponse {
  id: string;
  registerId: string;
  status: CashShiftStatus;
  openedAt: string;
  closedAt: string | null;
  openingTotal: string;
  expectedCash: string | null;
  countedCash: string | null;
  cashDifference: string | null;
  denominations: CashShiftDenominationEntry[];
  inventoryCounts: ShiftInventoryCountEntry[];
}

export interface OpenCashShiftRequest {
  registerId: string;
  openingAmount?: string;
  openingCounts?: DenominationCountEntry[];
  inventoryCounts: InventoryCountEntry[];
}

export type CashMovementType = "ENTRY" | "WITHDRAWAL" | "EXPENSE";

export interface CreateCashMovementRequest {
  type: CashMovementType;
  reason: string;
  amount?: string;
  denominations?: DenominationCountEntry[];
}

export interface CashMovementResponse {
  id: string;
  type: CashMovementType;
  amount: string;
  reason: string;
  createdAt: string | null;
  userId: string;
  saleId: string | null;
  denominations: DenominationCountEntry[];
}

export interface CloseCashShiftRequest {
  countedCash?: string;
  closingCounts?: DenominationCountEntry[];
  closingNotes?: string;
  inventoryCounts: InventoryCountEntry[];
}
