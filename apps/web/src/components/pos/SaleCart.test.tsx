import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent, within } from "@/test/render";
import { SaleCart, resolveCart } from "./SaleCart";
import type { ProductResponse } from "@/types/product";
import type { CartLine } from "./cart";

function product(overrides: Partial<ProductResponse> = {}): ProductResponse {
  return {
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
    ...overrides,
  };
}

function line(overrides: Partial<CartLine> = {}): CartLine {
  return { productId: "p-1", quantity: 1, useWholesalePrice: false, ...overrides };
}

function setup(props: Partial<Parameters<typeof SaleCart>[0]> = {}) {
  const onUpdateQuantity = vi.fn();
  const onToggleWholesale = vi.fn();
  const onRemove = vi.fn();
  renderWithProviders(
    <SaleCart
      cart={[line()]}
      products={[product()]}
      discountAmount={0}
      onUpdateQuantity={onUpdateQuantity}
      onToggleWholesale={onToggleWholesale}
      onRemove={onRemove}
      {...props}
    />
  );
  return { onUpdateQuantity, onToggleWholesale, onRemove };
}

describe("resolveCart", () => {
  it("prices a line at the retail price by default", () => {
    const [resolved] = resolveCart([line({ quantity: 2 })], [product()]);

    expect(resolved.unitPrice).toBe(250);
    expect(resolved.lineSubtotal).toBe(500);
    expect(resolved.lineTotal).toBe(500);
  });

  it("switches to the wholesale price when the line asks for it", () => {
    const [resolved] = resolveCart([line({ useWholesalePrice: true })], [product()]);

    expect(resolved.unitPrice).toBe(200);
  });

  it("applies the product tax rate as a percentage", () => {
    const [resolved] = resolveCart([line({ quantity: 2 })], [product({ taxRate: "18" })]);

    expect(resolved.lineSubtotal).toBe(500);
    expect(resolved.lineTax).toBe(90);
    expect(resolved.lineTotal).toBe(590);
  });

  it("drops a line whose product is no longer in the catalog", () => {
    // Otherwise the cart would show a blank row and charge for it.
    expect(resolveCart([line({ productId: "ghost" })], [product()])).toEqual([]);
  });

  it("treats a missing price as zero rather than NaN", () => {
    const [resolved] = resolveCart([line()], [product({ salePrice: null })]);

    expect(resolved.unitPrice).toBe(0);
    expect(resolved.lineTotal).toBe(0);
  });
});

describe("SaleCart", () => {
  it("invites the cashier to add products when the cart is empty", () => {
    setup({ cart: [] });

    expect(screen.getByText(/sin productos agregados/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /aumentar cantidad/i })).not.toBeInTheDocument();
  });

  it("counts the products, in singular and plural", () => {
    setup();
    expect(screen.getByText("1 producto")).toBeInTheDocument();

    setup({
      cart: [line(), line({ productId: "p-2" })],
      products: [product(), product({ id: "p-2", description: "Pan" })],
    });
    expect(screen.getByText("2 productos")).toBeInTheDocument();
  });

  it("shows the totals with thousands separators", () => {
    setup({ cart: [line({ quantity: 50 })], products: [product({ taxRate: "18" })] });

    // 50 x 250.00 = 12,500.00 subtotal, 18% tax = 2,250.00, total 14,750.00.
    // The grand total also appears as the line total, since there is a single line.
    expect(screen.getByText("RD$12,500.00")).toBeInTheDocument();
    expect(screen.getByText("RD$2,250.00")).toBeInTheDocument();
    expect(screen.getAllByText("RD$14,750.00").length).toBeGreaterThan(0);
  });

  it("only shows the discount row when there is a discount", () => {
    setup();
    expect(screen.queryByText("Descuento")).not.toBeInTheDocument();

    setup({ discountAmount: 50 });
    expect(screen.getByText("Descuento")).toBeInTheDocument();
    expect(screen.getByText("-RD$50.00")).toBeInTheDocument();
  });

  it("never shows a negative total, however large the discount", () => {
    setup({ discountAmount: 10_000 });

    // Subtotal and tax rows can read 0.00 too, so assert none of them went negative.
    expect(screen.queryByText(/-RD\$(?!10,000)/)).not.toBeInTheDocument();
    expect(screen.getAllByText("RD$0.00").length).toBeGreaterThan(0);
  });

  it("raises and lowers the quantity", async () => {
    const user = userEvent.setup();
    const { onUpdateQuantity } = setup({ cart: [line({ quantity: 3 })] });

    await user.click(screen.getByRole("button", { name: /aumentar cantidad/i }));
    expect(onUpdateQuantity).toHaveBeenCalledWith("p-1", 4);

    await user.click(screen.getByRole("button", { name: /reducir cantidad/i }));
    expect(onUpdateQuantity).toHaveBeenCalledWith("p-1", 2);
  });

  it("stops the quantity at one instead of reaching zero", async () => {
    const user = userEvent.setup();
    const { onUpdateQuantity } = setup({ cart: [line({ quantity: 1 })] });

    await user.click(screen.getByRole("button", { name: /reducir cantidad/i }));

    // Removing a line is what the X button is for; the minus button must not empty it.
    expect(onUpdateQuantity).toHaveBeenCalledWith("p-1", 1);
  });

  it("removes the line the cashier points at", async () => {
    const user = userEvent.setup();
    const { onRemove } = setup({
      cart: [line(), line({ productId: "p-2" })],
      products: [product(), product({ id: "p-2", description: "Pan" })],
    });

    await user.click(screen.getByRole("button", { name: "Quitar Pan" }));

    expect(onRemove).toHaveBeenCalledWith("p-2");
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("toggles the wholesale price for that line", async () => {
    const user = userEvent.setup();
    const { onToggleWholesale } = setup();

    await user.click(screen.getByLabelText(/precio mayoreo/i));

    expect(onToggleWholesale).toHaveBeenCalledWith("p-1");
  });

  it("reflects the wholesale price already selected on a line", () => {
    setup({ cart: [line({ useWholesalePrice: true })] });

    expect(screen.getByLabelText(/precio mayoreo/i)).toBeChecked();
    const item = screen.getByRole("listitem");
    // Unit price and line total both read 200.00 for a single unit.
    expect(within(item).getAllByText(/RD\$200\.00/).length).toBeGreaterThan(0);
  });
});
