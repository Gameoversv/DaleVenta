import { describe, expect, it } from "vitest";
import { NAV_SECTIONS, isNavItemVisible, visibleNavSections, type NavItem, type NavViewer } from "./nav";
import type { PermissionCode, TenantFeatures } from "@/types/auth";

const ALL_FEATURES_OFF: TenantFeatures = {
  fiscalModuleEnabled: false,
  cashDenominationsEnabled: false,
  multiBranchEnabled: false,
  multiRegisterEnabled: false,
  rentalModuleEnabled: false,
  purchaseModuleEnabled: false,
};

function viewer(overrides: Partial<NavViewer> = {}): NavViewer {
  return {
    role: "CASHIER",
    permissions: [],
    features: ALL_FEATURES_OFF,
    ...overrides,
  };
}

function itemFor(href: string): NavItem {
  const item = NAV_SECTIONS.flatMap((section) => section.items).find((i) => i.href === href);
  if (!item) throw new Error(`No nav item registered for ${href}`);
  return item;
}

describe("isNavItemVisible", () => {
  it("hides an item whose single required permission is missing", () => {
    expect(isNavItemVisible(itemFor("/pos"), viewer())).toBe(false);
  });

  it("shows an item once its permission is granted", () => {
    expect(isNavItemVisible(itemFor("/pos"), viewer({ permissions: ["SALE_CREATE"] }))).toBe(true);
  });

  it("shows an anyPermission item when at least one of the codes is granted", () => {
    const sales = itemFor("/sales");
    expect(isNavItemVisible(sales, viewer({ permissions: ["SALE_VIEW_HISTORY"] }))).toBe(true);
    expect(isNavItemVisible(sales, viewer({ permissions: ["SALE_CREATE"] }))).toBe(true);
    expect(isNavItemVisible(sales, viewer({ permissions: ["CUSTOMER_VIEW"] }))).toBe(false);
  });

  it("hides a feature-gated item while the tenant module is off, even for an admin", () => {
    const rentals = itemFor("/rentals");
    expect(isNavItemVisible(rentals, viewer({ role: "ADMIN" }))).toBe(false);
    expect(
      isNavItemVisible(rentals, viewer({ role: "ADMIN", features: { ...ALL_FEATURES_OFF, rentalModuleEnabled: true } }))
    ).toBe(true);
  });

  it("hides a role-restricted item from other roles", () => {
    const fiscal = itemFor("/fiscal");
    expect(isNavItemVisible(fiscal, viewer({ role: "CASHIER" }))).toBe(false);
    expect(isNavItemVisible(fiscal, viewer({ role: "ADMIN" }))).toBe(true);
  });

  it("hides a role-restricted item when there is no signed-in user", () => {
    expect(isNavItemVisible(itemFor("/fiscal"), viewer({ role: undefined }))).toBe(false);
  });

  it("grants an admin every permission-gated item, matching the backend resolution", () => {
    const admin = viewer({ role: "ADMIN" });
    const permissionGated = NAV_SECTIONS.flatMap((s) => s.items).filter(
      (item) => (item.permission || item.anyPermission) && !item.feature
    );

    expect(permissionGated.every((item) => isNavItemVisible(item, admin))).toBe(true);
  });

  it("shows an item with no gate at all", () => {
    expect(isNavItemVisible(itemFor("/settings"), viewer())).toBe(true);
  });

  it("requires every declared gate to pass, not just one", () => {
    // Accounts payable needs both a purchase permission and the purchase module.
    const payable = itemFor("/reports/accounts-payable");
    const permissions: PermissionCode[] = ["PURCHASE_PAYABLE_VIEW"];

    expect(isNavItemVisible(payable, viewer({ permissions }))).toBe(false);
    expect(
      isNavItemVisible(payable, viewer({ permissions, features: { ...ALL_FEATURES_OFF, purchaseModuleEnabled: true } }))
    ).toBe(true);
  });
});

describe("visibleNavSections", () => {
  it("drops sections that end up with no visible item", () => {
    const sections = visibleNavSections(viewer());

    expect(sections.every((section) => section.items.length > 0)).toBe(true);
    // A cashier with no permissions still reaches Configuracion, which has no gate.
    expect(sections.flatMap((s) => s.items).map((i) => i.href)).toEqual(["/settings"]);
  });

  it("never leaks an item the viewer cannot open", () => {
    const cashier = viewer({ permissions: ["SALE_CREATE", "CASHSHIFT_OPEN"] });

    const hrefs = visibleNavSections(cashier).flatMap((section) => section.items.map((i) => i.href));

    expect(hrefs).toContain("/pos");
    expect(hrefs).toContain("/cash-shift");
    expect(hrefs).not.toContain("/audit");
    expect(hrefs).not.toContain("/reports/sales");
    expect(hrefs).not.toContain("/fiscal");
  });
});
