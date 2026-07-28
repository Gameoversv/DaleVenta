import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/test/render";
import { FinalShiftSummary } from "./FinalShiftSummary";
import type { CashShiftSummaryResponse } from "@/types/cash-shift";

const get = vi.fn();
vi.mock("@/lib/api", () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

function shift(overrides: Partial<CashShiftSummaryResponse> = {}): CashShiftSummaryResponse {
  return {
    id: "s-1",
    registerId: "r-1",
    status: "CLOSED",
    openedAt: "2026-07-27T10:00:00.000Z",
    closedAt: "2026-07-27T18:00:00.000Z",
    openingTotal: "2000.00",
    expectedCash: "5000.00",
    countedCash: "5000.00",
    cashDifference: "0.00",
    denominations: [],
    inventoryCounts: [],
    ...overrides,
  };
}

function setup(overrides: Partial<CashShiftSummaryResponse> = {}) {
  const onDone = vi.fn();
  renderWithProviders(<FinalShiftSummary shift={shift(overrides)} onDone={onDone} />);
  return { onDone };
}

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({
    data: { data: [{ id: "p-1", description: "Bizcocho", internalCode: "BIZ-001", unit: "unit" }] },
  });
});

describe("FinalShiftSummary cash", () => {
  it("reports a square drawer", () => {
    setup();

    expect(screen.getByText(/caja cuadrada/i)).toBeInTheDocument();
  });

  it("reports a surplus and points at the closing notes", () => {
    setup({ countedCash: "5300.00", cashDifference: "300.00" });

    expect(screen.getByText(/sobrante de caja/i)).toBeInTheDocument();
    expect(screen.getByText(/revisa las notas del cierre/i)).toBeInTheDocument();
  });

  it("reports a shortfall, describing the gap in absolute terms", () => {
    setup({ countedCash: "4700.00", cashDifference: "-300.00" });

    expect(screen.getByText(/faltante de caja/i)).toBeInTheDocument();
    // The wording states the size of the gap; the sign is already in the label.
    expect(screen.getByText(/diferencia de RD\$300\.00/i)).toBeInTheDocument();
  });

  it("shows expected against counted so the two can be compared", () => {
    setup({ countedCash: "4700.00", cashDifference: "-300.00" });

    expect(screen.getByText(/5000\.00/)).toBeInTheDocument();
    expect(screen.getByText(/4700\.00/)).toBeInTheDocument();
  });

  it("treats a missing difference as square rather than crashing", () => {
    setup({ cashDifference: null });

    expect(screen.getByText(/caja cuadrada/i)).toBeInTheDocument();
  });

  it("hands control back when the cashier is done reading", async () => {
    const user = userEvent.setup();
    const { onDone } = setup();

    await user.click(screen.getByRole("button", { name: /volver/i }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe("FinalShiftSummary inventory", () => {
  it("omits the inventory table when nothing was counted", () => {
    setup();

    expect(screen.queryByText(/conteo de inventario/i)).not.toBeInTheDocument();
  });

  it("shows the counted rows with the product name once it loads", async () => {
    setup({
      inventoryCounts: [
        { productId: "p-1", openingQuantity: 50, expectedQuantity: 48, closingQuantity: 48 },
      ] as CashShiftSummaryResponse["inventoryCounts"],
    });

    expect(await screen.findByText("Bizcocho")).toBeInTheDocument();
    expect(screen.getByText(/conteo de inventario/i)).toBeInTheDocument();
  });

  it("shows the stock gap between expected and counted", async () => {
    setup({
      inventoryCounts: [
        { productId: "p-1", openingQuantity: 50, expectedQuantity: 48, closingQuantity: 45 },
      ] as CashShiftSummaryResponse["inventoryCounts"],
    });

    await screen.findByText("Bizcocho");
    // Three units short of what the system expected.
    expect(screen.getByText("-3")).toBeInTheDocument();
  });

  it("falls back to the product id when the catalog has not resolved", () => {
    get.mockResolvedValue({ data: { data: [] } });
    setup({
      inventoryCounts: [
        { productId: "p-1", openingQuantity: 50, expectedQuantity: 50, closingQuantity: 50 },
      ] as CashShiftSummaryResponse["inventoryCounts"],
    });

    expect(screen.getByText("p-1")).toBeInTheDocument();
  });
});
