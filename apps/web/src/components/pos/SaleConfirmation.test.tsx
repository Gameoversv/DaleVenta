import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { SaleConfirmation } from "./SaleConfirmation";
import type { SaleResponse } from "@/types/sale";
import type { ProductResponse } from "@/types/product";
import type { PermissionCode } from "@/types/auth";

const post = vi.fn();
vi.mock("@/lib/api", () => ({ default: { post: (...a: unknown[]) => post(...a) } }));

let permissions: PermissionCode[] = [];
vi.mock("@/hooks/usePermission", () => ({
  usePermission: (code: PermissionCode) => permissions.includes(code),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const PRODUCTS: ProductResponse[] = [
  {
    id: "p-1",
    categoryId: "c-1",
    internalCode: "BIZ-001",
    barcode: null,
    description: "Bizcocho",
    unit: "unit",
    cost: "100.00",
    salePrice: "250.00",
    wholesalePrice: "200.00",
    taxRate: "0",
    tracksInventory: true,
    rentable: false,
    active: true,
  },
];

function sale(overrides: Partial<SaleResponse> = {}): SaleResponse {
  return {
    id: "s-1",
    invoiceNumber: "FV-000123",
    fiscalReceiptType: null,
    fiscalNcf: null,
    customerId: null,
    status: "COMPLETED",
    subtotal: "500.00",
    taxTotal: "0.00",
    discountAmount: "0.00",
    total: "500.00",
    createdAt: "2026-07-27T18:15:00.000Z",
    voidedAt: null,
    voidReason: null,
    items: [{ productId: "p-1", quantity: 2, unitPrice: "250.00", taxRate: "0", lineTotal: "500.00" }],
    payments: [{ method: "CASH", amount: "500.00" }],
    ...overrides,
  } as SaleResponse;
}

function setup(overrides: Partial<SaleResponse> = {}) {
  const onNewSale = vi.fn();
  renderWithProviders(
    <SaleConfirmation
      sale={sale(overrides)}
      products={PRODUCTS}
      registerId="r-1"
      onNewSale={onNewSale}
    />
  );
  return { onNewSale };
}

beforeEach(() => {
  post.mockReset();
  permissions = [];
});

describe("SaleConfirmation", () => {
  it("confirms the sale with its invoice number and total", () => {
    setup();

    expect(screen.getByText(/venta confirmada/i)).toBeInTheDocument();
    expect(screen.getByText(/FV-000123/)).toBeInTheDocument();
    // The amount also appears as the single line total, so anchor on the summary label.
    expect(screen.getByText(/Total: RD\$500\.00/)).toBeInTheDocument();
  });

  it("shows the fiscal receipt number only when the sale carries one", () => {
    setup();
    expect(screen.queryByText(/NCF:/)).not.toBeInTheDocument();

    setup({ fiscalNcf: "B0100000001", fiscalReceiptType: "B01" });
    expect(screen.getByText(/B0100000001/)).toBeInTheDocument();
  });

  it("lists the payment methods used, including a mixed sale", () => {
    setup({
      payments: [
        { method: "CASH", amount: "300.00" },
        { method: "TRANSFER", amount: "200.00" },
      ] as SaleResponse["payments"],
    });

    expect(screen.getByText(/CASH, TRANSFER/)).toBeInTheDocument();
  });

  it("reads as voided once the sale is voided", () => {
    setup({ status: "VOIDED", voidedAt: "2026-07-27T19:00:00.000Z", voidReason: "Error" });

    expect(screen.getByText(/venta anulada/i)).toBeInTheDocument();
  });

  it("hides the void action from a cashier without SALE_VOID", () => {
    setup();

    expect(screen.queryByRole("button", { name: /anular/i })).not.toBeInTheDocument();
  });

  it("offers the void action to an authorised user", () => {
    permissions = ["SALE_VOID"];
    setup();

    expect(screen.getByRole("button", { name: /anular/i })).toBeInTheDocument();
  });

  it("never offers to void a sale that is already voided", () => {
    permissions = ["SALE_VOID"];
    setup({ status: "VOIDED" });

    expect(screen.queryByRole("button", { name: /anular/i })).not.toBeInTheDocument();
  });

  it("requires a reason before voiding, so no void is unexplained", async () => {
    permissions = ["SALE_VOID"];
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /anular/i }));
    const confirm = await screen.findByRole("button", { name: /confirmar/i });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText(/motivo/i), "Cobro duplicado");
    expect(confirm).toBeEnabled();
  });

  it("rejects whitespace as a reason", async () => {
    permissions = ["SALE_VOID"];
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /anular/i }));
    await user.type(await screen.findByLabelText(/motivo/i), "   ");

    expect(screen.getByRole("button", { name: /confirmar/i })).toBeDisabled();
  });

  it("posts the void with its reason", async () => {
    permissions = ["SALE_VOID"];
    post.mockResolvedValue({ data: { data: sale({ status: "VOIDED" }) } });
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /anular/i }));
    await user.type(await screen.findByLabelText(/motivo/i), "Cobro duplicado");
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][0]).toBe("/api/sales/s-1/void");
    expect(post.mock.calls[0][1]).toEqual({ voidReason: "Cobro duplicado" });
  });

  it("hands control back for the next sale", async () => {
    const user = userEvent.setup();
    const { onNewSale } = setup();

    await user.click(screen.getByRole("button", { name: /nueva venta/i }));

    expect(onNewSale).toHaveBeenCalledTimes(1);
  });
});
