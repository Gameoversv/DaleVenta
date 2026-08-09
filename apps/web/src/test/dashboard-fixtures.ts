import type { PermissionCode, TenantFeatures, UserResponse } from "@/types/auth";
import type { BranchResponse, RegisterResponse } from "@/types/branch";
import type { DashboardSummaryResponse } from "@/types/dashboard";
import type { SalesReportResponse } from "@/types/report";
import type { InvoiceSettingsResponse } from "@/types/settings";

/**
 * Backing data for the dashboard screen tests.
 *
 * Kept apart from the tests themselves because every screen asks the same handful of endpoints
 * (branches, registers, tenant features) before it asks anything of its own; inlining that per
 * file is how the fixtures drift apart and a screen starts passing against a shape the API never
 * returns.
 */

export const BRANCH: BranchResponse = {
  id: "b-1",
  name: "Centro",
  address: null,
  active: true,
  createdAt: "2026-01-01T08:00:00Z",
};

export const REGISTER: RegisterResponse = {
  id: "r-1",
  name: "Caja 1",
  branchId: BRANCH.id,
  active: true,
};

export const ALL_FEATURES_ON: TenantFeatures = {
  fiscalModuleEnabled: true,
  cashDenominationsEnabled: true,
  multiBranchEnabled: true,
  multiRegisterEnabled: true,
  rentalModuleEnabled: true,
  purchaseModuleEnabled: true,
};

const DASHBOARD_SUMMARY: DashboardSummaryResponse = {
  salesToday: 0,
  revenueToday: "0.00",
  openCashShifts: 0,
  lowStockItems: 0,
  activeCustomers: 0,
  accountsReceivable: "0.00",
};

const SALES_REPORT: SalesReportResponse = {
  from: "2026-01-01",
  to: "2026-01-31",
  totalSales: 0,
  completedSales: 0,
  voidedSales: 0,
  grossRevenue: "0.00",
  discountTotal: "0.00",
  taxTotal: "0.00",
  averageTicket: "0.00",
  payments: [],
  topProducts: [],
  dailySales: [],
};

const INVOICE_SETTINGS: InvoiceSettingsResponse = {
  businessName: "DaleVenta",
  rnc: null,
  phone: null,
  email: null,
  address: null,
  city: null,
  logoUrl: null,
  footerMessage: null,
  printSize: "LETTER",
  showLogo: false,
  showRnc: false,
  showPhone: false,
  showEmail: false,
  showAddress: false,
  showCustomer: false,
  showTax: true,
};

/** Endpoints whose payload a screen reads straight through, keyed by request URL. */
const PAYLOADS: Record<string, unknown> = {
  "/api/branches": [BRANCH],
  "/api/registers": [REGISTER],
  "/api/products": [],
  "/api/customers": [],
  "/api/categories": [],
  "/api/sales": [],
  "/api/users": [],
  "/api/suppliers": [],
  "/api/purchases": [],
  "/api/quotations": [],
  "/api/rentals": [],
  "/api/denominations": [],
  "/api/cash-shifts": [],
  "/api/fiscal/sequences": [],
  "/api/reports/daily-closings": [],
  "/api/purchases/accounts-payable": [],
  "/api/credit/accounts-receivable": [],
  "/api/fiscal/status": ALL_FEATURES_ON,
  "/api/dashboard/summary": DASHBOARD_SUMMARY,
  "/api/settings/invoice": INVOICE_SETTINGS,
  "/api/reports/sales": SALES_REPORT,
};

/**
 * Answers a GET the way the API envelope does.
 *
 * An unmapped URL is left pending rather than answered with an empty body: a screen that reads a
 * shape we never described would otherwise crash on a fixture bug and read as a product failure.
 * Pending keeps it on its loading branch, which is a state the screen is built to render.
 */
export function dashboardGet(url: string): Promise<unknown> {
  if (url === "/api/audit-logs") {
    return Promise.resolve({ data: { data: [], meta: { page: 0, size: 30, total: 0 } } });
  }
  if (url in PAYLOADS) {
    return Promise.resolve({ data: { data: PAYLOADS[url] } });
  }
  return new Promise(() => {});
}

export function adminUser(): UserResponse {
  return {
    id: "u-admin",
    name: "Ada Admin",
    email: "ada@dalventa.test",
    role: "ADMIN",
    active: true,
  } as UserResponse;
}

export function cashierUser(): UserResponse {
  return {
    id: "u-cashier",
    name: "Cai Cajero",
    email: "cai@dalventa.test",
    role: "CASHIER",
    active: true,
  } as UserResponse;
}

export const NO_PERMISSIONS: PermissionCode[] = [];
