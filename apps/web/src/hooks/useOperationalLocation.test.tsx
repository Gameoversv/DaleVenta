import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { useOperationalLocation } from "./useOperationalLocation";
import type { BranchResponse, RegisterResponse } from "@/types/branch";

const get = vi.fn();
vi.mock("@/lib/api", () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

function branch(id: string, name: string): BranchResponse {
  return { id, name, address: null, active: true, createdAt: "" };
}

function register(id: string, name: string, branchId: string): RegisterResponse {
  return { id, name, branchId, active: true };
}

/** Answers /api/branches and /api/registers the way the real endpoints do. */
function mockApi(branches: BranchResponse[], registersByBranch: Record<string, RegisterResponse[]>) {
  get.mockImplementation((url: string, config?: { params?: { branchId?: string } }) => {
    if (url === "/api/branches") {
      return Promise.resolve({ data: { data: branches } });
    }
    const branchId = config?.params?.branchId ?? "";
    return Promise.resolve({ data: { data: registersByBranch[branchId] ?? [] } });
  });
}

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useOperationalLocation", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("selects the only branch and register without asking the cashier", async () => {
    mockApi([branch("b-1", "Centro")], { "b-1": [register("r-1", "Caja 1", "b-1")] });

    const { result } = renderHook(() => useOperationalLocation(), { wrapper });

    await waitFor(() => expect(result.current.registerId).toBe("r-1"));
    expect(result.current.branchId).toBe("b-1");
    expect(result.current.selectedBranch?.name).toBe("Centro");
    expect(result.current.selectedRegister?.name).toBe("Caja 1");
    expect(result.current.needsBranchSelection).toBe(false);
    expect(result.current.needsRegisterSelection).toBe(false);
  });

  it("waits for an explicit choice when several branches are assigned", async () => {
    mockApi([branch("b-1", "Centro"), branch("b-2", "Norte")], {
      "b-2": [register("r-2", "Caja Norte", "b-2")],
    });

    const { result } = renderHook(() => useOperationalLocation(), { wrapper });

    await waitFor(() => expect(result.current.hasMultipleBranches).toBe(true));
    expect(result.current.branchId).toBe("");
    expect(result.current.needsBranchSelection).toBe(true);

    act(() => result.current.selectBranch("b-2"));

    await waitFor(() => expect(result.current.registerId).toBe("r-2"));
    expect(result.current.branchId).toBe("b-2");
  });

  it("clears the register when the branch changes, so a shift never opens on a foreign caja", async () => {
    mockApi([branch("b-1", "Centro"), branch("b-2", "Norte")], {
      "b-1": [register("r-1", "Caja 1", "b-1"), register("r-1b", "Caja 2", "b-1")],
      "b-2": [register("r-2", "Caja Norte", "b-2")],
    });

    const { result } = renderHook(() => useOperationalLocation(), { wrapper });

    await waitFor(() => expect(result.current.hasMultipleBranches).toBe(true));
    act(() => result.current.selectBranch("b-1"));
    await waitFor(() => expect(result.current.hasMultipleRegisters).toBe(true));

    act(() => result.current.selectRegister("r-1b"));
    await waitFor(() => expect(result.current.registerId).toBe("r-1b"));

    act(() => result.current.selectBranch("b-2"));
    await waitFor(() => expect(result.current.branchId).toBe("b-2"));
    // The old register is dropped immediately; the new branch's sole caja lands once it loads.
    expect(result.current.registerId).not.toBe("r-1b");
    await waitFor(() => expect(result.current.registerId).toBe("r-2"));
  });

  it("ignores a manual branch that is no longer assigned", async () => {
    mockApi([branch("b-1", "Centro"), branch("b-2", "Norte")], {});

    const { result } = renderHook(() => useOperationalLocation(), { wrapper });

    await waitFor(() => expect(result.current.hasMultipleBranches).toBe(true));
    act(() => result.current.selectBranch("b-removed"));

    await waitFor(() => expect(result.current.branchId).toBe(""));
    expect(result.current.needsBranchSelection).toBe(true);
  });

  it("reports an unassigned cashier instead of an empty picker", async () => {
    mockApi([], {});

    const { result } = renderHook(() => useOperationalLocation(), { wrapper });

    await waitFor(() => expect(result.current.hasNoBranches).toBe(true));
    expect(result.current.branches).toEqual([]);
    expect(result.current.branchId).toBe("");
  });

  it("reports a branch left without registers", async () => {
    mockApi([branch("b-1", "Centro")], { "b-1": [] });

    const { result } = renderHook(() => useOperationalLocation(), { wrapper });

    await waitFor(() => expect(result.current.hasNoRegisters).toBe(true));
    expect(result.current.registerId).toBe("");
  });

  it("skips registers entirely for screens that only work by branch", async () => {
    mockApi([branch("b-1", "Centro")], { "b-1": [register("r-1", "Caja 1", "b-1")] });

    const { result } = renderHook(() => useOperationalLocation({ requireRegister: false }), { wrapper });

    await waitFor(() => expect(result.current.branchId).toBe("b-1"));
    expect(result.current.registers).toEqual([]);
    expect(result.current.registerId).toBe("");
    expect(result.current.needsRegisterSelection).toBe(false);
    expect(get).not.toHaveBeenCalledWith(expect.stringContaining("/api/registers"));
  });

  it("surfaces a failed branch load as an error, not as an empty assignment", async () => {
    get.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useOperationalLocation(), { wrapper });

    await waitFor(() => expect(result.current.branchesError).toBe(true));
    expect(result.current.hasNoBranches).toBe(true);
  });
});
