import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { CashReceivedFields } from "./CashReceivedFields";
import type { DenominationResponse } from "@/types/cash-shift";

const get = vi.fn();
vi.mock("@/lib/api", () => ({ default: { get: (...args: unknown[]) => get(...args) } }));

const DENOMINATIONS: DenominationResponse[] = [
  { id: "d-100", value: "100.00", active: true } as DenominationResponse,
  { id: "d-500", value: "500.00", active: true } as DenominationResponse,
];

function setup(props: Partial<Parameters<typeof CashReceivedFields>[0]> = {}) {
  const onEntriesChange = vi.fn();
  const onAmountInputChange = vi.fn();
  renderWithProviders(
    <CashReceivedFields
      inputId="cash-received-amount"
      inputLabel="Recibido"
      countedLabel="Recibido"
      insufficientMessage="Recibido insuficiente para cubrir el total."
      denominationsEnabled={false}
      denominations={DENOMINATIONS}
      entries={[]}
      onEntriesChange={onEntriesChange}
      receivedTotal={0}
      changeAmountCents={0}
      suggestion={undefined}
      amountInput=""
      onAmountInputChange={onAmountInputChange}
      directChangeAmount={0}
      {...props}
    />
  );
  return { onEntriesChange, onAmountInputChange };
}

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: { data: DENOMINATIONS } });
});

describe("CashReceivedFields typing an amount", () => {
  it("says nothing until an amount is typed", () => {
    setup();

    expect(screen.getByLabelText("Recibido")).toHaveValue(null);
    expect(screen.queryByText(/cambio/i)).not.toBeInTheDocument();
  });

  it("reports what the cashier typed", async () => {
    const user = userEvent.setup();
    const { onAmountInputChange } = setup();

    await user.type(screen.getByLabelText("Recibido"), "6");

    expect(onAmountInputChange).toHaveBeenCalledWith("6");
  });

  it("shows the change owed once the amount covers the sale", () => {
    setup({ amountInput: "600", directChangeAmount: 100 });

    expect(screen.getByText("Cambio: RD$100.00")).toBeInTheDocument();
  });

  it("says the amount falls short instead of showing negative change", () => {
    setup({ amountInput: "400", directChangeAmount: -100 });

    expect(screen.getByText("Recibido insuficiente para cubrir el total.")).toBeInTheDocument();
    expect(screen.queryByText(/cambio/i)).not.toBeInTheDocument();
  });

  it("carries the wording of the payment it belongs to", () => {
    setup({
      inputLabel: "Recibido en efectivo",
      insufficientMessage: "Recibido insuficiente para cubrir la parte en efectivo.",
      amountInput: "10",
      directChangeAmount: -90,
    });

    expect(screen.getByLabelText("Recibido en efectivo")).toBeInTheDocument();
    expect(screen.getByText("Recibido insuficiente para cubrir la parte en efectivo.")).toBeInTheDocument();
  });
});

describe("CashReceivedFields counting denominations", () => {
  it("counts the drawer instead of asking for an amount", async () => {
    setup({ denominationsEnabled: true });

    expect(await screen.findByLabelText("RD$100")).toBeInTheDocument();
    expect(screen.queryByLabelText("Recibido")).not.toBeInTheDocument();
  });

  it("reports the notes the cashier counted", async () => {
    const user = userEvent.setup();
    const { onEntriesChange } = setup({ denominationsEnabled: true });

    await user.type(await screen.findByLabelText("RD$500"), "2");

    await waitFor(() =>
      expect(onEntriesChange).toHaveBeenLastCalledWith([{ denominationId: "d-500", quantity: 2 }])
    );
  });

  it("adds up what came in and what goes back", async () => {
    setup({
      denominationsEnabled: true,
      entries: [{ denominationId: "d-500", quantity: 2 }],
      receivedTotal: 1000,
      changeAmountCents: 50000,
    });

    expect(await screen.findByText(/Recibido: RD\$1,000\.00 · Cambio: RD\$500\.00/)).toBeInTheDocument();
  });

  it("says the count falls short of the total", async () => {
    setup({
      denominationsEnabled: true,
      entries: [{ denominationId: "d-100", quantity: 1 }],
      receivedTotal: 100,
      changeAmountCents: -40000,
    });

    expect(await screen.findByText("Recibido insuficiente para cubrir el total.")).toBeInTheDocument();
  });

  it("warns when the drawer cannot make the change exactly", async () => {
    setup({
      denominationsEnabled: true,
      entries: [{ denominationId: "d-500", quantity: 1 }],
      receivedTotal: 500,
      changeAmountCents: 12500,
      suggestion: { exact: false, combination: [] },
    });

    expect(await screen.findByText(/no hay combinacion exacta de cambio/i)).toBeInTheDocument();
  });

  it("spells out which notes the change comes in", async () => {
    setup({
      denominationsEnabled: true,
      showChangeCombination: true,
      entries: [{ denominationId: "d-500", quantity: 2 }],
      receivedTotal: 1000,
      changeAmountCents: 50000,
      suggestion: { exact: true, combination: [{ denominationId: "d-100", quantity: 5 }] },
    });

    expect(await screen.findByText("Cambio en: 5 x RD$100")).toBeInTheDocument();
  });

  it("falls back to the denomination id when the drawer names one it does not know", async () => {
    setup({
      denominationsEnabled: true,
      showChangeCombination: true,
      entries: [{ denominationId: "d-500", quantity: 2 }],
      suggestion: { exact: true, combination: [{ denominationId: "d-unknown", quantity: 1 }] },
    });

    expect(await screen.findByText("Cambio en: 1 x d-unknown")).toBeInTheDocument();
  });

  it("keeps the change breakdown to the tab that asked for it", async () => {
    setup({
      denominationsEnabled: true,
      entries: [{ denominationId: "d-500", quantity: 2 }],
      receivedTotal: 1000,
      changeAmountCents: 50000,
      suggestion: { exact: true, combination: [{ denominationId: "d-100", quantity: 5 }] },
    });

    expect(await screen.findByLabelText("RD$100")).toBeInTheDocument();
    expect(screen.queryByText(/cambio en:/i)).not.toBeInTheDocument();
  });
});
