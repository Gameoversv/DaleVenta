import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { CustomerCreditPanel } from "./CustomerCreditPanel";
import type { CustomerResponse } from "@/types/customer";
import type { PermissionCode } from "@/types/auth";

const get = vi.fn();
const put = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api", () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    put: (...a: unknown[]) => put(...a),
    post: (...a: unknown[]) => post(...a),
  },
}));

let permissions: PermissionCode[] = [];
vi.mock("@/hooks/usePermission", () => ({
  usePermission: (code: PermissionCode) => permissions.includes(code),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const customer = { id: "cus-1", fullName: "Ana Perez", active: true } as CustomerResponse;

let profile: { creditEnabled: boolean; creditLimit: string | null };
let account: { balance: string };
let invoices: Array<{ saleId: string; createdAt: string; outstanding: string }>;

function mockApi() {
  get.mockImplementation((url: string) => {
    if (url.includes("credit-profile")) return Promise.resolve({ data: { data: profile } });
    if (url.includes("credit-account")) return Promise.resolve({ data: { data: account } });
    if (url.includes("credit-invoices")) return Promise.resolve({ data: { data: invoices } });
    return Promise.resolve({ data: { data: [] } });
  });
}

async function openPanel() {
  const user = userEvent.setup();
  renderWithProviders(<CustomerCreditPanel customer={customer} trigger={<button>Credito</button>} />);
  await user.click(screen.getByRole("button", { name: "Credito" }));
  return user;
}

beforeEach(() => {
  get.mockReset();
  put.mockReset();
  post.mockReset();
  permissions = [];
  profile = { creditEnabled: true, creditLimit: "1000.00" };
  account = { balance: "400.00" };
  invoices = [];
  mockApi();
});

describe("balance and availability", () => {
  it("shows what the customer owes and what is left of the limit", async () => {
    permissions = ["CUSTOMER_EDIT"];
    await openPanel();

    expect(await screen.findByText("RD$400.00")).toBeInTheDocument();
    // 1000 limit minus 400 owed.
    expect(screen.getByText("RD$600.00")).toBeInTheDocument();
  });

  it("shows no availability figure for open credit, since there is no ceiling", async () => {
    permissions = ["CUSTOMER_EDIT"];
    profile = { creditEnabled: true, creditLimit: null };
    await openPanel();

    await screen.findByText("RD$400.00");
    expect(screen.queryByText("Disponible")).not.toBeInTheDocument();
  });

  it("reports availability as negative once the customer is over the limit", async () => {
    permissions = ["CUSTOMER_EDIT"];
    account = { balance: "1500.00" };
    await openPanel();

    expect(await screen.findByText("-RD$500.00")).toBeInTheDocument();
  });

  it("keeps the balance section from a user who cannot view credit", async () => {
    await openPanel();

    await screen.findByText(/credito de ana perez/i);
    expect(screen.queryByText("Balance actual")).not.toBeInTheDocument();
  });
});

describe("credit profile", () => {
  it("is read-only without CREDIT_AUTHORIZE", async () => {
    permissions = ["CUSTOMER_EDIT"];
    await openPanel();

    expect(await screen.findByText(/habilitado, limite RD\$1000\.00/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /guardar perfil/i })).not.toBeInTheDocument();
  });

  it("describes open credit distinctly from a limited one", async () => {
    permissions = ["CUSTOMER_EDIT"];
    profile = { creditEnabled: true, creditLimit: null };
    await openPanel();

    expect(await screen.findByText(/credito abierto \(sin limite\)/i)).toBeInTheDocument();
  });

  it("says so when credit is not enabled at all", async () => {
    permissions = ["CUSTOMER_EDIT"];
    profile = { creditEnabled: false, creditLimit: null };
    await openPanel();

    expect(await screen.findAllByText(/credito no habilitado/i)).not.toHaveLength(0);
  });

  it("loads the stored limit into the form for an authorised user", async () => {
    permissions = ["CUSTOMER_EDIT", "CREDIT_AUTHORIZE"];
    await openPanel();

    await waitFor(() => expect(screen.getByLabelText(/limite de credito/i)).toHaveValue("1000.00"));
    expect(screen.getByLabelText(/credito habilitado/i)).toBeChecked();
  });

  it("saves an empty limit as open credit rather than as zero", async () => {
    permissions = ["CUSTOMER_EDIT", "CREDIT_AUTHORIZE"];
    put.mockResolvedValue({ data: {} });
    const user = await openPanel();

    const limit = await screen.findByLabelText(/limite de credito/i);
    await waitFor(() => expect(limit).toHaveValue("1000.00"));
    await user.clear(limit);
    await user.click(screen.getByRole("button", { name: /guardar perfil/i }));

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    // null means "no ceiling"; 0 would mean "cannot buy anything on credit".
    expect(put.mock.calls[0][1]).toEqual({ creditEnabled: true, creditLimit: null });
  });

  it("sends the typed limit untouched, since the backend parses it as a decimal", async () => {
    permissions = ["CUSTOMER_EDIT", "CREDIT_AUTHORIZE"];
    put.mockResolvedValue({ data: {} });
    const user = await openPanel();

    const limit = await screen.findByLabelText(/limite de credito/i);
    await waitFor(() => expect(limit).toHaveValue("1000.00"));
    await user.clear(limit);
    await user.type(limit, "2500.50");
    await user.click(screen.getByRole("button", { name: /guardar perfil/i }));

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put.mock.calls[0][1]).toEqual({ creditEnabled: true, creditLimit: "2500.50" });
  });
});

describe("recording a payment", () => {
  beforeEach(() => {
    permissions = ["CUSTOMER_EDIT", "CREDIT_RECEIVE_PAYMENT"];
    invoices = [
      { saleId: "s-1", createdAt: "2026-07-01T10:00:00.000Z", outstanding: "250.00" },
      { saleId: "s-2", createdAt: "2026-07-05T10:00:00.000Z", outstanding: "150.00" },
    ];
  });

  it("will not submit without an amount", async () => {
    await openPanel();

    expect(await screen.findByRole("button", { name: /registrar abono/i })).toBeDisabled();
  });

  it("prefills the outstanding amount when a specific invoice is chosen", async () => {
    const user = await openPanel();

    await user.selectOptions(await screen.findByLabelText(/aplicar a/i), "s-1");

    expect(screen.getByLabelText(/^monto/i)).toHaveValue(250);
  });

  it("posts a payment against the chosen invoice", async () => {
    post.mockResolvedValue({ data: {} });
    const user = await openPanel();

    await user.selectOptions(await screen.findByLabelText(/aplicar a/i), "s-2");
    await user.type(screen.getByLabelText(/nombre de quien paga/i), "Hermano");
    await user.click(screen.getByRole("button", { name: /registrar abono/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][0]).toBe("/api/customers/cus-1/credit-payments");
    expect(post.mock.calls[0][1]).toMatchObject({
      amount: "150.00",
      saleId: "s-2",
      payerName: "Hermano",
    });
  });

  it("omits the invoice for a general payment against the whole balance", async () => {
    post.mockResolvedValue({ data: {} });
    const user = await openPanel();

    await user.type(await screen.findByLabelText(/^monto/i), "100");
    await user.click(screen.getByRole("button", { name: /registrar abono/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][1].saleId).toBeUndefined();
    expect(post.mock.calls[0][1].payerName).toBeUndefined();
  });

  it("hides the payment form from a user without CREDIT_RECEIVE_PAYMENT", async () => {
    permissions = ["CUSTOMER_EDIT"];
    await openPanel();

    await screen.findByText("Balance actual");
    expect(screen.queryByRole("button", { name: /registrar abono/i })).not.toBeInTheDocument();
  });
});
