import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { CheckoutPanel } from "./CheckoutPanel";
import type { CustomerResponse } from "@/types/customer";
import type { PermissionCode } from "@/types/auth";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api", () => ({
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}));

let permissions: PermissionCode[] = [];
vi.mock("@/hooks/usePermission", () => ({
  usePermission: (code: PermissionCode) => permissions.includes(code),
}));

const customer = { id: "cus-1", fullName: "Ana Perez", active: true } as CustomerResponse;

let creditProfile: { creditEnabled: boolean; creditLimit: string | null };
let creditAccount: { balance: string };

function mockApi() {
  get.mockImplementation((url: string) => {
    if (url.includes("credit-profile")) return Promise.resolve({ data: { data: creditProfile } });
    if (url.includes("credit-account")) return Promise.resolve({ data: { data: creditAccount } });
    return Promise.resolve({ data: { data: [] } });
  });
  // Change suggestion, only used when counting denominations.
  post.mockResolvedValue({ data: { data: { exact: true, denominations: [] } } });
}

function setup(props: Partial<Parameters<typeof CheckoutPanel>[0]> = {}) {
  const onConfirm = vi.fn();
  renderWithProviders(
    <CheckoutPanel
      registerId="r-1"
      customer={null}
      preDiscountTotal={500}
      disabled={false}
      isSubmitting={false}
      fiscalModuleEnabled={false}
      fiscalSequences={[]}
      cashDenominationsEnabled={false}
      hasRentalItems={false}
      onConfirm={onConfirm}
      {...props}
    />
  );
  return { onConfirm };
}

// Reads "Cobrar", and "Cobrando..." while the parent reports the sale in flight.
const confirmButton = () => screen.getByRole("button", { name: /cobrar|cobrando/i });

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  permissions = [];
  creditProfile = { creditEnabled: true, creditLimit: "1000.00" };
  creditAccount = { balance: "0.00" };
  mockApi();
});

describe("CheckoutPanel totals", () => {
  it("charges the cart total when there is no discount", () => {
    setup();

    expect(screen.getByText("RD$500.00")).toBeInTheDocument();
  });

  it("ignores a discount typed by a cashier without the permission", async () => {
    const user = userEvent.setup();
    setup();

    const discount = screen.queryByLabelText(/descuento/i);
    // Without SALE_DISCOUNT the field is not even offered.
    expect(discount).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/recibido/i), "500");
    expect(confirmButton()).toBeEnabled();
  });

  it("subtracts a discount for an authorised cashier", async () => {
    permissions = ["SALE_DISCOUNT"];
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText(/descuento/i), "100");

    expect(screen.getByText("RD$400.00")).toBeInTheDocument();
  });
});

describe("CheckoutPanel cash", () => {
  it("stays blocked until the amount received covers the sale", async () => {
    const user = userEvent.setup();
    setup();

    expect(confirmButton()).toBeDisabled();

    await user.type(screen.getByLabelText(/recibido/i), "400");
    expect(confirmButton()).toBeDisabled();

    await user.clear(screen.getByLabelText(/recibido/i));
    await user.type(screen.getByLabelText(/recibido/i), "500");
    expect(confirmButton()).toBeEnabled();
  });

  it("shows the change owed once the payment exceeds the sale", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText(/recibido/i), "600");

    expect(screen.getByText(/Cambio: RD\$100\.00/)).toBeInTheDocument();
  });

  it("confirms a cash sale for the full amount", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();

    await user.type(screen.getByLabelText(/recibido/i), "500");
    await user.click(confirmButton());

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const [payments, discount] = onConfirm.mock.calls[0];
    expect(payments).toEqual([
      { method: "CASH", amount: "500.00", receivedDenominations: [] },
    ]);
    expect(discount).toBe(0);
  });
});

describe("CheckoutPanel transfer", () => {
  it("needs both bank and reference before confirming", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /transferencia/i }));
    expect(confirmButton()).toBeDisabled();

    await user.type(screen.getByLabelText(/banco/i), "Banreservas");
    expect(confirmButton()).toBeDisabled();

    await user.type(screen.getByLabelText(/referencia/i), "REF-001");
    expect(confirmButton()).toBeEnabled();
  });

  it("confirms a transfer carrying its bank and reference", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();

    await user.click(screen.getByRole("button", { name: /transferencia/i }));
    await user.type(screen.getByLabelText(/banco/i), "Banreservas");
    await user.type(screen.getByLabelText(/referencia/i), "REF-001");
    await user.click(confirmButton());

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm.mock.calls[0][0]).toEqual([
      { method: "TRANSFER", amount: "500.00", bank: "Banreservas", reference: "REF-001" },
    ]);
  });
});

describe("CheckoutPanel credit", () => {
  it("refuses a credit sale without a customer", async () => {
    permissions = ["CREDIT_AUTHORIZE"];
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /credito/i }));

    expect(confirmButton()).toBeDisabled();
  });

  it("refuses a cashier who cannot authorise credit", async () => {
    const user = userEvent.setup();
    setup({ customer });

    await user.click(screen.getByRole("button", { name: /credito/i }));

    expect(confirmButton()).toBeDisabled();
  });

  it("allows a credit sale inside the customer limit", async () => {
    permissions = ["CREDIT_AUTHORIZE"];
    const user = userEvent.setup();
    const { onConfirm } = setup({ customer });

    await user.click(screen.getByRole("button", { name: /credito/i }));
    await waitFor(() => expect(confirmButton()).toBeEnabled());
    await user.click(confirmButton());

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm.mock.calls[0][0]).toEqual([{ method: "CREDIT", amount: "500.00" }]);
  });

  it("blocks a credit sale that would exceed the limit", async () => {
    permissions = ["CREDIT_AUTHORIZE"];
    creditAccount = { balance: "800.00" }; // only 200 left of a 1000 limit
    const user = userEvent.setup();
    setup({ customer });

    await user.click(screen.getByRole("button", { name: /credito/i }));

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(confirmButton()).toBeDisabled();
  });
});

describe("CheckoutPanel rentals", () => {
  it("keeps a rental blocked until it has a customer and a return date", async () => {
    const user = userEvent.setup();
    setup({ hasRentalItems: true, customer });

    await user.type(screen.getByLabelText(/recibido/i), "500");
    expect(confirmButton()).toBeDisabled();

    await user.type(screen.getByLabelText(/devolucion/i), "2026-08-05T10:00");
    expect(confirmButton()).toBeEnabled();
  });

  it("adds the deposit on top of the sale and passes the rental details on", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup({ hasRentalItems: true, customer });

    await user.type(screen.getByLabelText(/devolucion/i), "2026-08-05T10:00");
    await user.type(screen.getByLabelText(/deposito/i), "300");
    await user.type(screen.getByLabelText(/recibido/i), "800");
    await user.click(confirmButton());

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    // 500 sale + 300 deposit.
    expect(onConfirm.mock.calls[0][0][0].amount).toBe("800.00");
    // The deposit is passed through as typed; the API parses it as a decimal.
    expect(onConfirm.mock.calls[0][3]).toMatchObject({ depositAmount: "300" });
  });
});

describe("CheckoutPanel guards", () => {
  it("stays blocked while the parent reports the sale as submitting", async () => {
    const user = userEvent.setup();
    setup({ isSubmitting: true });

    await user.type(screen.getByLabelText(/recibido/i), "500");

    expect(confirmButton()).toBeDisabled();
  });

  it("stays blocked while the parent disables the panel", async () => {
    const user = userEvent.setup();
    setup({ disabled: true });

    await user.type(screen.getByLabelText(/recibido/i), "500");

    expect(confirmButton()).toBeDisabled();
  });

  it("cannot confirm an empty cart", () => {
    setup({ preDiscountTotal: 0 });

    expect(confirmButton()).toBeDisabled();
  });
});
