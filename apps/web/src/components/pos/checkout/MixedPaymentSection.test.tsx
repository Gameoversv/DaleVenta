import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/test/render";
import { MixedPaymentSection } from "./MixedPaymentSection";
import type { DenominationResponse } from "@/types/cash-shift";
import type { CreditAccountResponse, CreditProfileResponse } from "@/types/credit";

const get = vi.fn();
vi.mock("@/lib/api", () => ({ default: { get: (...args: unknown[]) => get(...args) } }));

const DENOMINATIONS: DenominationResponse[] = [
  { id: "d-100", value: "100.00", active: true } as DenominationResponse,
];

const PROFILE = { creditEnabled: true, creditLimit: "1000.00" } as CreditProfileResponse;
const ACCOUNT = { balance: "0.00" } as CreditAccountResponse;

function setup(props: Partial<Parameters<typeof MixedPaymentSection>[0]> = {}) {
  const handlers = {
    onCashAmountInputChange: vi.fn(),
    onSecondMethodChange: vi.fn(),
    onReceivedEntriesChange: vi.fn(),
    onReceivedAmountInputChange: vi.fn(),
    onBankChange: vi.fn(),
    onReferenceChange: vi.fn(),
  };
  renderWithProviders(
    <MixedPaymentSection
      total={500}
      cashAmountInput=""
      cashAmount={0}
      remainingAmount={500}
      secondMethod="TRANSFER"
      cashDenominationsEnabled={false}
      denominations={DENOMINATIONS}
      receivedEntries={[]}
      receivedTotal={0}
      changeAmountCents={0}
      suggestion={undefined}
      receivedAmountInput=""
      directChangeAmount={0}
      bank=""
      reference=""
      canAuthorizeCredit
      hasCustomer
      creditProfile={PROFILE}
      creditAccount={ACCOUNT}
      creditEligible
      creditAvailable={1000}
      creditWithinLimit
      {...handlers}
      {...props}
    />
  );
  return handlers;
}

/** A settled split: 200 of a 500 sale in cash, 300 left for the second method. */
const SPLIT = { cashAmountInput: "200", cashAmount: 200, remainingAmount: 300 } as const;

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: { data: DENOMINATIONS } });
});

describe("MixedPaymentSection split", () => {
  it("asks for the cash share before anything else", () => {
    setup();

    expect(screen.getByText("Indica cuanto pagara en efectivo.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/recibido en efectivo/i)).not.toBeInTheDocument();
  });

  it("refuses a split that leaves nothing for the second method", () => {
    setup({ cashAmountInput: "500", cashAmount: 500, remainingAmount: 0 });

    expect(screen.getByText("El efectivo debe ser menor que el total para usar pago mixto.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/recibido en efectivo/i)).not.toBeInTheDocument();
  });

  it("names the remainder after the method that will settle it", () => {
    setup({ ...SPLIT });

    expect(screen.getByText("Monto por transferencia")).toBeInTheDocument();
    expect(screen.getByText("RD$300.00")).toBeInTheDocument();
  });

  it("renames the remainder when it goes on credit instead", () => {
    setup({ ...SPLIT, secondMethod: "CREDIT" });

    expect(screen.getByText("Monto a credito")).toBeInTheDocument();
  });

  it("reports a change of cash share", async () => {
    const user = userEvent.setup();
    const { onCashAmountInputChange } = setup();

    await user.type(screen.getByLabelText(/monto en efectivo/i), "2");

    expect(onCashAmountInputChange).toHaveBeenCalledWith("2");
  });

  it("reports a change of second method", async () => {
    const user = userEvent.setup();
    const { onSecondMethodChange } = setup({ secondMethod: "CREDIT" });

    await user.selectOptions(screen.getByLabelText(/restante en/i), "TRANSFER");

    expect(onSecondMethodChange).toHaveBeenCalledWith("TRANSFER");
  });

  it("closes the credit remainder to a cashier who cannot authorise it", () => {
    setup({ canAuthorizeCredit: false });

    expect(screen.getByRole("option", { name: "Credito" })).toBeDisabled();
  });
});

describe("MixedPaymentSection second method", () => {
  it("asks for the bank and reference of the transfer half", async () => {
    const user = userEvent.setup();
    const { onBankChange, onReferenceChange } = setup({ ...SPLIT });

    await user.type(screen.getByLabelText(/banco/i), "B");
    await user.type(screen.getByLabelText(/referencia/i), "R");

    expect(onBankChange).toHaveBeenCalledWith("B");
    expect(onReferenceChange).toHaveBeenCalledWith("R");
  });

  it("shows the credit headroom instead of a bank when the remainder goes on credit", () => {
    setup({ ...SPLIT, secondMethod: "CREDIT" });

    expect(screen.queryByLabelText(/banco/i)).not.toBeInTheDocument();
    expect(screen.getByText("Disponible: RD$1000.00")).toBeInTheDocument();
  });

  it("refuses a remainder past the credit headroom in its own wording", () => {
    setup({ ...SPLIT, secondMethod: "CREDIT", creditAvailable: 100, creditWithinLimit: false });

    expect(screen.getByText("La parte a credito excede el disponible.")).toBeInTheDocument();
  });
});

describe("MixedPaymentSection cash half", () => {
  it("asks how much cash came in against the cash share, not the total", async () => {
    const user = userEvent.setup();
    const { onReceivedAmountInputChange } = setup({ ...SPLIT });

    await user.type(screen.getByLabelText("Recibido en efectivo"), "3");

    expect(onReceivedAmountInputChange).toHaveBeenCalledWith("3");
  });

  it("measures a short payment against the cash share", () => {
    setup({ ...SPLIT, receivedAmountInput: "150", directChangeAmount: -50 });

    expect(screen.getByText("Recibido insuficiente para cubrir la parte en efectivo.")).toBeInTheDocument();
  });

  it("counts the drawer when the tenant counts denominations", async () => {
    setup({ ...SPLIT, cashDenominationsEnabled: true });

    expect(await screen.findByLabelText("RD$100")).toBeInTheDocument();
    expect(screen.queryByLabelText("Recibido en efectivo")).not.toBeInTheDocument();
  });

  it("keeps the change breakdown out of a mixed payment", async () => {
    setup({
      ...SPLIT,
      cashDenominationsEnabled: true,
      receivedEntries: [{ denominationId: "d-100", quantity: 3 }],
      receivedTotal: 300,
      changeAmountCents: 10000,
      suggestion: { exact: true, combination: [{ denominationId: "d-100", quantity: 1 }] },
    });

    expect(await screen.findByText(/Recibido efectivo: RD\$300\.00 · Cambio: RD\$100\.00/)).toBeInTheDocument();
    expect(screen.queryByText(/cambio en:/i)).not.toBeInTheDocument();
  });
});
