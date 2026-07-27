import { describe, expect, it } from "vitest";
import { landingPageFor } from "./auth-context";
import type { PermissionCode, UserResponse } from "@/types/auth";

function user(role: UserResponse["role"]): UserResponse {
  return { id: "u-1", name: "Tester", email: "tester@dalventa.test", role, active: true };
}

describe("landingPageFor", () => {
  it("sends a super admin to the SaaS console regardless of permissions", () => {
    expect(landingPageFor(user("SUPER_ADMIN"), [])).toBe("/super-admin");
  });

  it("prefers the dashboard when the user can see it", () => {
    const permissions: PermissionCode[] = ["DASHBOARD_VIEW", "SALE_CREATE", "CASHSHIFT_OPEN"];
    expect(landingPageFor(user("ADMIN"), permissions)).toBe("/dashboard");
  });

  it("sends a cashier straight to the POS", () => {
    expect(landingPageFor(user("CASHIER"), ["SALE_CREATE", "CASHSHIFT_OPEN"])).toBe("/pos");
  });

  it("falls back to the cash shift when the user can only open a register", () => {
    expect(landingPageFor(user("CASHIER"), ["CASHSHIFT_OPEN"])).toBe("/cash-shift");
  });

  it("never lands on a page the user cannot open, defaulting to customers", () => {
    expect(landingPageFor(user("CASHIER"), [])).toBe("/customers");
    expect(landingPageFor(undefined, [])).toBe("/customers");
  });
});
