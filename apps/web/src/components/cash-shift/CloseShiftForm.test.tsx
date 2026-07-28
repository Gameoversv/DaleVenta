import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { CloseShiftForm } from "./CloseShiftForm";
import type { CashShiftSummaryResponse, DenominationResponse } from "@/types/cash-shift";
import type { TenantFeatures } from "@/types/auth";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api", () => ({
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}));

let contextFeatures: TenantFeatures;
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ tenantFeatures: contextFeatures }) }));

// Counting stock at close has its own component and its own tests.
vi.mock("./InventoryCountGrid", () => ({ InventoryCountGrid: () => <div /> }));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const DENOMINATIONS: DenominationResponse[] = [
  { id: "d500", value: "500.00", type: "BILL", active: true },
  { id: "d100", value: "100.00", type: "BILL", active: true },
];

function shift(overrides: Partial<CashShiftSummaryResponse> = {}): CashShiftSummaryResponse {
  return {
    id: "s-1",
    registerId: "r-1",
    status: "OPEN",
    openedAt: "2026-07-27T10:00:00.000Z",
    closedAt: null,
    openingTotal: "2000.00",
    expectedCash: "1000.00",
    countedCash: null,
    cashDifference: null,
    denominations: [],
    inventoryCounts: [],
    ...overrides,
  };
}

function features(cashDenominationsEnabled: boolean): TenantFeatures {
  return {
    fiscalModuleEnabled: false,
    cashDenominationsEnabled,
    multiBranchEnabled: false,
    multiRegisterEnabled: false,
    rentalModuleEnabled: false,
    purchaseModuleEnabled: false,
  };
}

function setup(overrides: Partial<CashShiftSummaryResponse> = {}) {
  const onClosed = vi.fn();
  const onCancel = vi.fn();
  renderWithProviders(
    <CloseShiftForm shift={shift(overrides)} branchId="b-1" onCancel={onCancel} onClosed={onClosed} />
  );
  return { onClosed, onCancel };
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  contextFeatures = features(true);
  get.mockImplementation((url: string) =>
    url === "/api/denominations"
      ? Promise.resolve({ data: { data: DENOMINATIONS } })
      : Promise.resolve({ data: { data: features(true) } })
  );
});

describe("CloseShiftForm counting by denomination", () => {
  it("shows the expected cash and no difference until something is counted", async () => {
    setup();

    expect(await screen.findByText("RD$1,000.00")).toBeInTheDocument();
    // Counted and difference both read "-" rather than a misleading zero.
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/caja cuadrada/i)).not.toBeInTheDocument();
  });

  it("calls the drawer square when the count matches", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(await screen.findByLabelText("RD$500"), "2");

    expect(screen.getByText(/caja cuadrada/i)).toBeInTheDocument();
    expect(screen.getByText("RD$0.00")).toBeInTheDocument();
  });

  it("reports a surplus when the drawer holds more than expected", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(await screen.findByLabelText("RD$500"), "3");

    expect(screen.getByText(/sobrante/i)).toBeInTheDocument();
    expect(screen.getByText("RD$500.00")).toBeInTheDocument();
  });

  it("reports a shortfall, keeping the amount signed", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(await screen.findByLabelText("RD$100"), "3");

    expect(screen.getByText(/faltante/i)).toBeInTheDocument();
    expect(screen.getByText("-RD$700.00")).toBeInTheDocument();
  });

  it("keeps the confirm button disabled until the cashier counts something", async () => {
    const user = userEvent.setup();
    setup();

    const confirm = await screen.findByRole("button", { name: /confirmar cierre/i });
    expect(confirm).toBeDisabled();

    await user.type(await screen.findByLabelText("RD$500"), "2");
    expect(confirm).toBeEnabled();
  });

  it("sends the counted denominations and no direct amount", async () => {
    const user = userEvent.setup();
    post.mockResolvedValue({ data: { data: shift({ status: "CLOSED" }) } });
    const { onClosed } = setup();

    await user.type(await screen.findByLabelText("RD$500"), "2");
    await user.type(screen.getByLabelText(/^notas/i), "Todo en orden");
    await user.click(screen.getByRole("button", { name: /confirmar cierre/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][0]).toBe("/api/cash-shifts/s-1/close");
    expect(post.mock.calls[0][1]).toMatchObject({
      countedCash: undefined,
      closingCounts: [{ denominationId: "d500", quantity: 2 }],
      closingNotes: "Todo en orden",
    });
    await waitFor(() => expect(onClosed).toHaveBeenCalledTimes(1));
  });

  it("marks the notes as required once there is a difference", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(await screen.findByLabelText("RD$500"), "3");

    expect(screen.getByText(/obligatorio: hay diferencia de caja/i)).toBeInTheDocument();
  });

  it("still lets the shift close with a difference and empty notes", async () => {
    // The label announces the notes as mandatory but nothing enforces it. Pinning the current
    // behaviour so that turning it into a real rule is a deliberate, visible change.
    const user = userEvent.setup();
    post.mockResolvedValue({ data: { data: shift({ status: "CLOSED" }) } });
    setup();

    await user.type(await screen.findByLabelText("RD$500"), "3");
    await user.click(screen.getByRole("button", { name: /confirmar cierre/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][1].closingNotes).toBeUndefined();
  });
});

describe("CloseShiftForm counting a single amount", () => {
  beforeEach(() => {
    contextFeatures = features(false);
    get.mockImplementation((url: string) =>
      url === "/api/denominations"
        ? Promise.resolve({ data: { data: DENOMINATIONS } })
        : Promise.resolve({ data: { data: features(false) } })
    );
  });

  it("asks for one amount instead of a denomination grid", async () => {
    setup();

    expect(await screen.findByLabelText(/efectivo contado/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("RD$500")).not.toBeInTheDocument();
  });

  it("computes the difference from the typed amount", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(await screen.findByLabelText(/efectivo contado/i), "1200");

    expect(screen.getByText(/sobrante/i)).toBeInTheDocument();
    expect(screen.getByText("RD$200.00")).toBeInTheDocument();
  });

  it("sends the amount as a decimal string and no denomination counts", async () => {
    const user = userEvent.setup();
    post.mockResolvedValue({ data: { data: shift({ status: "CLOSED" }) } });
    setup();

    await user.type(await screen.findByLabelText(/efectivo contado/i), "1000");
    await user.click(screen.getByRole("button", { name: /confirmar cierre/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    // The backend parses this as a decimal, so it must not be a formatted string.
    expect(post.mock.calls[0][1]).toMatchObject({ countedCash: "1000.00", closingCounts: [] });
  });
});
