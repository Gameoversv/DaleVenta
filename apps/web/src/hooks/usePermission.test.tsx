import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermission, useAnyPermission } from "./usePermission";
import type { PermissionCode, UserResponse } from "@/types/auth";

const authState = { user: undefined as UserResponse | undefined, permissions: [] as PermissionCode[] };

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
}));

function signIn(role: UserResponse["role"], permissions: PermissionCode[]) {
  authState.user = { id: "u-1", name: "T", email: "t@dalventa.test", role, active: true };
  authState.permissions = permissions;
}

describe("usePermission", () => {
  it("grants an admin any permission", () => {
    signIn("ADMIN", []);
    expect(renderHook(() => usePermission("AUDIT_VIEW")).result.current).toBe(true);
  });

  it("requires the code for anyone else", () => {
    signIn("CASHIER", ["SALE_CREATE"]);
    expect(renderHook(() => usePermission("SALE_CREATE")).result.current).toBe(true);
    expect(renderHook(() => usePermission("AUDIT_VIEW")).result.current).toBe(false);
  });
});

describe("useAnyPermission", () => {
  it("is true when any one of the codes is granted", () => {
    signIn("CASHIER", ["SALE_CREATE"]);
    expect(renderHook(() => useAnyPermission("SALE_VIEW_HISTORY", "SALE_CREATE")).result.current).toBe(true);
  });

  it("is false when none of the codes is granted", () => {
    signIn("CASHIER", ["CUSTOMER_VIEW"]);
    expect(renderHook(() => useAnyPermission("SALE_VIEW_HISTORY", "SALE_CREATE")).result.current).toBe(false);
  });

  it("keeps a single hook call whichever code matches, unlike a short-circuited ||", () => {
    // The bug this replaces: `usePermission(a) || usePermission(b)` skips the second hook when the
    // first is true, so React sees a different hook count depending on the user's permissions.
    // Rendering the same hook under both permission sets must stay stable.
    signIn("CASHIER", ["SALE_VIEW_HISTORY", "SALE_CREATE"]);
    const both = renderHook(() => useAnyPermission("SALE_VIEW_HISTORY", "SALE_CREATE"));
    expect(both.result.current).toBe(true);

    signIn("CASHIER", ["SALE_CREATE"]);
    both.rerender();
    expect(both.result.current).toBe(true);

    signIn("CASHIER", []);
    both.rerender();
    expect(both.result.current).toBe(false);
  });
});
