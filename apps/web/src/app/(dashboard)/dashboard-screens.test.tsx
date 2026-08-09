import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ComponentType } from "react";
import { renderWithProviders, screen } from "@/test/render";
import {
  ALL_FEATURES_ON,
  adminUser,
  cashierUser,
  dashboardGet,
  NO_PERMISSIONS,
} from "@/test/dashboard-fixtures";
import type { PermissionCode, TenantFeatures, UserResponse } from "@/types/auth";

import AuditPage from "./audit/page";
import BranchesPage from "./branches/page";
import CashShiftPage from "./cash-shift/page";
import CashShiftHistoryPage from "./cash-shift/history/page";
import CustomersPage from "./customers/page";
import DashboardPage from "./dashboard/page";
import FiscalPage from "./fiscal/page";
import InventoryPage from "./inventory/page";
import PosPage from "./pos/page";
import RentalsPage from "./rentals/page";
import AccountsPayablePage from "./reports/accounts-payable/page";
import AccountsReceivablePage from "./reports/accounts-receivable/page";
import DailyCloseReportPage from "./reports/daily-close/page";
import SalesReportPage from "./reports/sales/page";
import SalesPage from "./sales/page";
import InvoicePage from "./sales/[id]/invoice/page";
import SettingsPage from "./settings/page";
import UsersSettingsPage from "./settings/users/page";

/**
 * One render per dashboard screen, as the tenant admin and as a cashier with nothing granted.
 *
 * These screens are thin: they read a permission, pick a branch and register, and hand off to the
 * component that does the work. What breaks there is not the markup but the wiring — a hook moved
 * above its gate, a provider a screen forgot it needed, a refusal that renders nothing at all. A
 * render is enough to catch every one of those, and it is the only check that runs against the
 * route module itself rather than the pieces underneath it.
 */

let currentUser: UserResponse | null = null;
let permissions: PermissionCode[] = [];
let tenantFeatures: TenantFeatures = ALL_FEATURES_ON;

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: currentUser,
    permissions,
    tenantFeatures,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const get = vi.fn();
vi.mock("@/lib/api", () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: vi.fn(() => Promise.resolve({ data: { data: null } })),
    put: vi.fn(() => Promise.resolve({ data: { data: null } })),
    patch: vi.fn(() => Promise.resolve({ data: { data: null } })),
    delete: vi.fn(() => Promise.resolve({ data: { data: null } })),
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "s-1" }),
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

interface Screen {
  /** Route the screen answers, used as the test name so a failure names the URL. */
  route: string;
  Component: ComponentType;
  /** The `h1` the screen puts up once it is allowed to render. */
  heading?: string;
  /** Copy proving the screen rendered, for the few that title themselves from loaded data. */
  ready?: RegExp;
  /** Wording a viewer without the permission gets instead. */
  refusal: RegExp;
}

const SCREENS: Screen[] = [
  { route: "/audit", Component: AuditPage, heading: "Auditoria", refusal: /no tienes permiso para ver auditoria/i },
  { route: "/branches", Component: BranchesPage, heading: "Sucursales", refusal: /administrar sucursales/i },
  { route: "/cash-shift", Component: CashShiftPage, heading: "Turno de Caja", refusal: /operar turnos de caja/i },
  {
    route: "/cash-shift/history",
    Component: CashShiftHistoryPage,
    heading: "Historial de caja",
    refusal: /consultar historial de turnos/i,
  },
  { route: "/customers", Component: CustomersPage, heading: "Clientes", refusal: /ver clientes/i },
  { route: "/dashboard", Component: DashboardPage, heading: "Hola, Ada", refusal: /ver el dashboard/i },
  { route: "/fiscal", Component: FiscalPage, heading: "Fiscal", refusal: /solo un administrador/i },
  { route: "/inventory", Component: InventoryPage, heading: "Inventario", refusal: /ver inventario/i },
  { route: "/pos", Component: PosPage, heading: "POS", refusal: /crear ventas/i },
  { route: "/rentals", Component: RentalsPage, heading: "Alquileres", refusal: /consultar alquileres/i },
  {
    route: "/reports/accounts-payable",
    Component: AccountsPayablePage,
    heading: "Cuentas por pagar",
    refusal: /ver cuentas por pagar/i,
  },
  {
    route: "/reports/accounts-receivable",
    Component: AccountsReceivablePage,
    heading: "Cuentas por cobrar",
    refusal: /ver reportes/i,
  },
  {
    route: "/reports/daily-close",
    Component: DailyCloseReportPage,
    heading: "Cierre diario",
    refusal: /consultar reportes/i,
  },
  {
    route: "/reports/sales",
    Component: SalesReportPage,
    heading: "Reporte de ventas",
    refusal: /consultar reportes/i,
  },
  { route: "/sales", Component: SalesPage, heading: "Historial de ventas", refusal: /consultar ventas/i },
  {
    // Titles itself from the loaded business name, so before the invoice arrives there is no h1.
    route: "/sales/[id]/invoice",
    Component: InvoicePage,
    ready: /cargando factura/i,
    refusal: /ver facturas/i,
  },
  {
    route: "/settings",
    Component: SettingsPage,
    heading: "Configuracion",
    refusal: /administrar configuracion o usuarios/i,
  },
  { route: "/settings/users", Component: UsersSettingsPage, heading: "Usuarios", refusal: /administrar usuarios/i },
];

beforeEach(() => {
  currentUser = adminUser();
  permissions = NO_PERMISSIONS;
  tenantFeatures = ALL_FEATURES_ON;
  get.mockReset();
  get.mockImplementation((url: string) => dashboardGet(url));
});

describe.each(SCREENS)("$route", ({ Component, heading, ready, refusal }) => {
  it("renders for an admin with every module enabled", async () => {
    renderWithProviders(<Component />);

    if (heading) {
      expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    } else {
      expect(await screen.findByText(ready!)).toBeInTheDocument();
    }
  });

  it("refuses a cashier who was granted nothing", async () => {
    currentUser = cashierUser();

    renderWithProviders(<Component />);

    expect(await screen.findByText(refusal)).toBeInTheDocument();
  });
});
