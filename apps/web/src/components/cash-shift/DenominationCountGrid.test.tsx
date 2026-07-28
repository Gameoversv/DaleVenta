import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/test/render";
import { DenominationCountGrid, formatDenominationValue } from "./DenominationCountGrid";
import type { DenominationResponse } from "@/types/cash-shift";

const get = vi.fn();
vi.mock("@/lib/api", () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

function denomination(overrides: Partial<DenominationResponse> = {}): DenominationResponse {
  return { id: "d500", value: "500.00", type: "BILL", active: true, ...overrides };
}

const CATALOG = [
  denomination(),
  denomination({ id: "d100", value: "100.00" }),
  denomination({ id: "d25", value: "25.00", type: "COIN" }),
  denomination({ id: "d5", value: "5.00", type: "COIN", active: false }),
];

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: { data: CATALOG } });
});

describe("formatDenominationValue", () => {
  it("drops the decimals on a whole denomination, since bills are labelled that way", () => {
    expect(formatDenominationValue("500.00")).toBe("RD$500");
    expect(formatDenominationValue("25")).toBe("RD$25");
  });

  it("keeps the cents on a fractional one", () => {
    expect(formatDenominationValue("0.50")).toBe("RD$0.50");
  });
});

describe("DenominationCountGrid", () => {
  it("offers only the active denominations", async () => {
    renderWithProviders(<DenominationCountGrid onChange={vi.fn()} />);

    expect(await screen.findByLabelText("RD$500")).toBeInTheDocument();
    expect(screen.getByLabelText("RD$100")).toBeInTheDocument();
    expect(screen.getByLabelText("RD$25")).toBeInTheDocument();
    // A retired denomination must not be countable.
    expect(screen.queryByLabelText("RD$5")).not.toBeInTheDocument();
  });

  it("totals face value times quantity as the cashier counts", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DenominationCountGrid onChange={vi.fn()} />);

    await user.type(await screen.findByLabelText("RD$500"), "2");
    await user.type(screen.getByLabelText("RD$25"), "4");

    expect(screen.getByText("Total: RD$1,100.00")).toBeInTheDocument();
  });

  it("reports only the denominations actually counted", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<DenominationCountGrid onChange={onChange} />);

    await user.type(await screen.findByLabelText("RD$100"), "3");

    expect(onChange).toHaveBeenLastCalledWith([{ denominationId: "d100", quantity: 3 }]);
  });

  it("drops a denomination from the count when it goes back to zero", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<DenominationCountGrid onChange={onChange} />);

    const field = await screen.findByLabelText("RD$100");
    await user.type(field, "3");
    await user.clear(field);
    await user.type(field, "0");

    // Sending a zero-quantity entry would have the backend record a count of nothing.
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("refuses a negative count", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<DenominationCountGrid onChange={onChange} />);

    await user.type(await screen.findByLabelText("RD$500"), "-5");

    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByText("Total: RD$0.00")).toBeInTheDocument();
  });

  it("explains that a shift cannot be opened or closed without denominations", async () => {
    get.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<DenominationCountGrid onChange={vi.fn()} />);

    expect(await screen.findByText(/no hay denominaciones activas/i)).toBeInTheDocument();
  });

  it("reports a failed lookup instead of showing an empty grid", async () => {
    get.mockImplementation(() => Promise.reject(new Error("network")));
    renderWithProviders(<DenominationCountGrid onChange={vi.fn()} />);

    expect(await screen.findByText(/no se pudieron cargar las denominaciones/i)).toBeInTheDocument();
  });
});
