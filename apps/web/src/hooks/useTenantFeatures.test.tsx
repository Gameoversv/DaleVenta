import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTenantFeatures } from "./useTenantFeatures";
import type { TenantFeatures, UserResponse } from "@/types/auth";

const get = vi.fn();
vi.mock("@/lib/api", () => ({ default: { get: (...args: unknown[]) => get(...args) } }));

const auth = { user: undefined as UserResponse | undefined, tenantFeatures: {} as TenantFeatures };
vi.mock("@/lib/auth-context", () => ({ useAuth: () => auth }));

const ALL_OFF: TenantFeatures = {
  fiscalModuleEnabled: false,
  cashDenominationsEnabled: false,
  multiBranchEnabled: false,
  multiRegisterEnabled: false,
  rentalModuleEnabled: false,
  purchaseModuleEnabled: false,
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function signIn(role: UserResponse["role"]) {
  auth.user = { id: "u-1", name: "T", email: "t@dalventa.test", role, active: true };
}

beforeEach(() => {
  get.mockReset();
  auth.user = undefined;
  auth.tenantFeatures = ALL_OFF;
});

describe("useTenantFeatures", () => {
  it("falls back to the flags already in the auth context before the fetch resolves", () => {
    signIn("ADMIN");
    auth.tenantFeatures = { ...ALL_OFF, rentalModuleEnabled: true };
    get.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useTenantFeatures(), { wrapper });

    expect(result.current.rentalModuleEnabled).toBe(true);
  });

  it("prefers the fetched flags once they arrive", async () => {
    signIn("ADMIN");
    get.mockResolvedValue({ data: { data: { ...ALL_OFF, purchaseModuleEnabled: true } } });

    const { result } = renderHook(() => useTenantFeatures(), { wrapper });

    await waitFor(() => expect(result.current.purchaseModuleEnabled).toBe(true));
  });

  it("does not fetch for an anonymous visitor", () => {
    renderHook(() => useTenantFeatures(), { wrapper });

    expect(get).not.toHaveBeenCalled();
  });

  it("does not fetch for a super admin, who has no tenant of their own", () => {
    signIn("SUPER_ADMIN");

    renderHook(() => useTenantFeatures(), { wrapper });

    expect(get).not.toHaveBeenCalled();
  });
});
