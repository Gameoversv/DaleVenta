import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./auth-context";
import type { MeResponse, PermissionCode } from "@/types/auth";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api", () => ({
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}));

const push = vi.fn();
let pathname = "/dashboard";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname,
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

function me(role: MeResponse["user"]["role"], permissions: PermissionCode[]): MeResponse {
  return {
    user: { id: "u-1", name: "Tester", email: "t@dalventa.test", role, active: true },
    permissions,
    tenantFeatures: {
      fiscalModuleEnabled: true,
      cashDenominationsEnabled: false,
      multiBranchEnabled: false,
      multiRegisterEnabled: false,
      rentalModuleEnabled: true,
      purchaseModuleEnabled: false,
    },
  };
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  push.mockReset();
  localStorage.clear();
  pathname = "/dashboard";
});

describe("session restore", () => {
  it("stays signed out and never calls the API without a token", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.permissions).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it("exposes the user, permissions and tenant features of a restored session", async () => {
    localStorage.setItem("token", "jwt-abc");
    get.mockResolvedValue({ data: { data: me("CASHIER", ["SALE_CREATE"]) } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user?.email).toBe("t@dalventa.test"));
    expect(result.current.permissions).toEqual(["SALE_CREATE"]);
    expect(result.current.tenantFeatures.rentalModuleEnabled).toBe(true);
  });

  it("drops a token the server no longer accepts", async () => {
    localStorage.setItem("token", "expired");
    get.mockImplementation(() => Promise.reject({ response: { status: 401 } }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(localStorage.getItem("token")).toBeNull());
    expect(result.current.user).toBeNull();
  });

  it("does not probe the session on the public auth pages", async () => {
    pathname = "/login";
    localStorage.setItem("token", "jwt-abc");

    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(get).not.toHaveBeenCalled());
  });

  it("falls back to every optional module off, except cash denominations", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Denominations default on: a tenant that never configured the module still counts cash.
    expect(result.current.tenantFeatures.cashDenominationsEnabled).toBe(true);
    expect(result.current.tenantFeatures.fiscalModuleEnabled).toBe(false);
    expect(result.current.tenantFeatures.purchaseModuleEnabled).toBe(false);
  });
});

describe("login", () => {
  it("stores the token and lands on the first page the user can open", async () => {
    post.mockResolvedValue({ data: { data: { token: "jwt-new" } } });
    get.mockResolvedValue({ data: { data: me("CASHIER", ["SALE_CREATE"]) } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login("t@dalventa.test", "secret"));

    expect(post).toHaveBeenCalledWith("/api/auth/login", {
      email: "t@dalventa.test",
      password: "secret",
    });
    expect(localStorage.getItem("token")).toBe("jwt-new");
    expect(push).toHaveBeenCalledWith("/pos");
  });

  it("routes each role to its own landing page", async () => {
    const cases: Array<[Parameters<typeof me>[0], PermissionCode[], string]> = [
      ["SUPER_ADMIN", [], "/super-admin"],
      ["ADMIN", ["DASHBOARD_VIEW", "SALE_CREATE"], "/dashboard"],
      ["CASHIER", ["CASHSHIFT_OPEN"], "/cash-shift"],
      ["CASHIER", [], "/customers"],
    ];

    for (const [role, permissions, expected] of cases) {
      push.mockReset();
      post.mockResolvedValue({ data: { data: { token: "jwt-new" } } });
      get.mockResolvedValue({ data: { data: me(role, permissions) } });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await act(() => result.current.login("t@dalventa.test", "secret"));

      expect(push).toHaveBeenCalledWith(expected);
    }
  });

  it("propagates a rejected login and leaves no token behind", async () => {
    post.mockImplementation(() => Promise.reject(new Error("Credenciales invalidas")));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(result.current.login("t@dalventa.test", "wrong")).rejects.toThrow(
      "Credenciales invalidas"
    );
    expect(localStorage.getItem("token")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  it("clears the token and returns to the login page", async () => {
    localStorage.setItem("token", "jwt-abc");
    get.mockResolvedValue({ data: { data: me("ADMIN", ["DASHBOARD_VIEW"]) } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    act(() => result.current.logout());

    expect(localStorage.getItem("token")).toBeNull();
    expect(push).toHaveBeenCalledWith("/login");
    await waitFor(() => expect(result.current.user).toBeNull());
  });
});

describe("useAuth", () => {
  it("refuses to run outside the provider rather than returning an empty session", () => {
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });
});
