import type { PaymentMethod } from "./sale";

export interface PaymentMethodReportItem {
  method: PaymentMethod;
  paymentsCount: number;
  amount: string;
}

export interface TopProductReportItem {
  productId: string;
  productName: string;
  quantity: number;
  revenue: string;
}

export interface DailySalesReportItem {
  date: string;
  salesCount: number;
  revenue: string;
}

export interface SalesReportResponse {
  from: string;
  to: string;
  totalSales: number;
  completedSales: number;
  voidedSales: number;
  grossRevenue: string;
  discountTotal: string;
  taxTotal: string;
  averageTicket: string;
  payments: PaymentMethodReportItem[];
  topProducts: TopProductReportItem[];
  dailySales: DailySalesReportItem[];
}

export interface DailyCloseShiftRow {
  id: string;
  status: string;
  openedAt: string | null;
  closedAt: string | null;
  expectedCash: string;
  countedCash: string;
  cashDifference: string;
}

export interface DailyClosePaymentBreakdown {
  method: PaymentMethod;
  count: number;
  amount: string;
}

export interface DailyCloseReportResponse {
  date: string;
  registerName: string;
  completedSales: number;
  voidedSales: number;
  grossRevenue: string;
  taxTotal: string;
  discountTotal: string;
  cashExpected: string;
  cashCounted: string;
  cashDifference: string;
  payments: DailyClosePaymentBreakdown[];
  shifts: DailyCloseShiftRow[];
}

export interface DailyClosingResponse {
  id: string;
  closeNumber: string;
  closeDate: string;
  registerId: string;
  registerName: string;
  closedByName: string;
  closedAt: string;
  completedSales: number;
  voidedSales: number;
  grossRevenue: string;
  taxTotal: string;
  discountTotal: string;
  cashExpected: string;
  cashCounted: string;
  cashDifference: string;
}
