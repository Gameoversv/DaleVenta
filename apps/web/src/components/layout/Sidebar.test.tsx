import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "@/test/render";
import { Sidebar } from "./Sidebar";
import type { PermissionCode, TenantFeatures, UserResponse } from "@/types/auth";

let user: UserResponse | undefined;
let permissions: PermissionCode[];
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user, permissions }) }));

let features: TenantFeatures;
vi.mock("@/hooks/useTenantFeatures", () => ({ useTenantFeatures: () => features }));

let pathname = "/dashboard";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

function signIn(role: UserResponse["role"]) {
  user = { id: "u-1", name: "Tester", email: "t@dalventa.test", role, active: true };
}

beforeEach(() => {
  user = undefined;
  permissions = [];
  pathname = "/dashboard";
  features = {
    fiscalModuleEnabled: false,
    cashDenominationsEnabled: true,
    multiBranchEnabled: false,
    multiRegisterEnabled: false,
    rentalModuleEnabled: false,
    purchaseModuleEnabled: false,
  };
});

function hrefs() {
  return screen.getAllByRole("link").map((link) => link.getAttribute("href"));
}

describe("Sidebar", () => {
  it("shows a cashier only what their permissions open", () => {
    signIn("CASHIER");
    permissions = ["SALE_CREATE", "CASHSHIFT_OPEN"];
    renderWithProviders(<Sidebar />);

    expect(hrefs()).toEqual(expect.arrayContaining(["/pos", "/cash-shift", "/settings"]));
    expect(hrefs()).not.toEqual(expect.arrayContaining(["/audit", "/reports/sales", "/fiscal"]));
  });

  it("gives an admin every permission-gated entry without listing them one by one", () => {
    signIn("ADMIN");
    renderWithProviders(<Sidebar />);

    expect(hrefs()).toEqual(expect.arrayContaining(["/pos", "/dashboard", "/reports/sales", "/audit"]));
  });

  it("keeps a feature-gated entry hidden from an admin while the module is off", () => {
    signIn("ADMIN");
    renderWithProviders(<Sidebar />);

    expect(hrefs()).not.toContain("/rentals");
    expect(hrefs()).not.toContain("/purchases");
  });

  it("reveals the module entries once the tenant enables them", () => {
    signIn("ADMIN");
    features = { ...features, rentalModuleEnabled: true, purchaseModuleEnabled: true };
    renderWithProviders(<Sidebar />);

    expect(hrefs()).toEqual(expect.arrayContaining(["/rentals", "/purchases"]));
  });

  it("restricts the fiscal entry to admins", () => {
    signIn("CASHIER");
    permissions = ["SALE_CREATE"];
    renderWithProviders(<Sidebar />);
    expect(hrefs()).not.toContain("/fiscal");
  });

  it("shows the fiscal entry to an admin", () => {
    signIn("ADMIN");
    renderWithProviders(<Sidebar />);

    expect(hrefs()).toContain("/fiscal");
  });

  it("drops a section left with no visible entry", () => {
    signIn("CASHIER");
    permissions = [];
    renderWithProviders(<Sidebar />);

    // Only Configuracion survives, and it lives under Gestion.
    expect(screen.queryByText("Operacion")).not.toBeInTheDocument();
    expect(hrefs()).toEqual(["/settings"]);
  });

  it("marks the current route so the cashier can see where they are", () => {
    signIn("CASHIER");
    permissions = ["SALE_CREATE"];
    pathname = "/pos";
    renderWithProviders(<Sidebar />);

    // Compare exact class tokens: the idle state carries hover:bg-sidebar-accent, which contains
    // the active class as a substring.
    const tokens = (href: string) =>
      screen.getAllByRole("link").find((l) => l.getAttribute("href") === href)!.className.split(/\s+/);

    expect(tokens("/pos")).toContain("bg-sidebar-accent");
    expect(tokens("/settings")).not.toContain("bg-sidebar-accent");
  });
});
