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
