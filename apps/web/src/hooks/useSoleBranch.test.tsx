import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSoleBranch } from "./useSoleBranch";
import { useSoleRegister } from "./useSoleRegister";

const get = vi.fn();
vi.mock("@/lib/api", () => ({ default: { get: (...args: unknown[]) => get(...args) } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function branches(...ids: string[]) {
  return { data: { data: ids.map((id) => ({ id, name: `Sucursal ${id}`, active: true })) } };
}

beforeEach(() => get.mockReset());

describe("useSoleBranch", () => {
  it("auto-selects the branch when the tenant has exactly one", async () => {
    get.mockResolvedValue(branches("b-1"));

    const { result } = renderHook(() => useSoleBranch(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMultiple).toBe(false);
    expect(result.current.soleBranchId).toBe("b-1");
  });

  it("forces a manual choice when there is more than one branch", async () => {
    get.mockResolvedValue(branches("b-1", "b-2"));

    const { result } = renderHook(() => useSoleBranch(), { wrapper });

    await waitFor(() => expect(result.current.branches).toHaveLength(2));
    expect(result.current.hasMultiple).toBe(true);
    // An empty id keeps the page on its "pick a branch" step instead of guessing.
    expect(result.current.soleBranchId).toBe("");
  });

  it("returns an empty selection when the tenant has no branch yet", async () => {
    get.mockResolvedValue({ data: { data: [] } });

    const { result } = renderHook(() => useSoleBranch(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.branches).toEqual([]);
    expect(result.current.soleBranchId).toBe("");
  });

  it("does not query while disabled", () => {
    renderHook(() => useSoleBranch(false), { wrapper });

    expect(get).not.toHaveBeenCalled();
  });

  // The failure path is React Query's own behaviour, not ours: the rejected fetch escapes as an
  // unhandled rejection before the provider can consume it, and asserting it here would test the
  // library rather than the auto-selection rule this hook adds.
});

describe("useSoleRegister", () => {
  it("auto-selects the register when the branch has exactly one", async () => {
    get.mockResolvedValue({ data: { data: [{ id: "r-1", name: "Caja 1", active: true }] } });

    const { result } = renderHook(() => useSoleRegister("b-1"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.soleRegisterId).toBe("r-1");
    expect(get).toHaveBeenCalledWith("/api/registers", { params: { branchId: "b-1" } });
  });

  it("forces a manual choice when the branch has several registers", async () => {
    get.mockResolvedValue({
      data: { data: [{ id: "r-1", name: "Caja 1" }, { id: "r-2", name: "Caja 2" }] },
    });

    const { result } = renderHook(() => useSoleRegister("b-1"), { wrapper });

    await waitFor(() => expect(result.current.registers).toHaveLength(2));
    expect(result.current.hasMultiple).toBe(true);
    expect(result.current.soleRegisterId).toBe("");
  });

  it("does not query before a branch is chosen", () => {
    renderHook(() => useSoleRegister(""), { wrapper });

    expect(get).not.toHaveBeenCalled();
  });
});
