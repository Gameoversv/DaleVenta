import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/test/render";
import { PurchaseItemRow, type PurchaseItemDraft } from "./page";
import type { CategoryResponse, ProductResponse } from "@/types/product";

vi.mock("@/lib/api", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const PRODUCTS = [
  { id: "p-1", description: "Harina", unit: "kg", cost: "40.00" },
  { id: "p-2", description: "Azucar", unit: "kg", cost: "35.00" },
] as unknown as ProductResponse[];

const CATEGORIES = [{ id: "c-1", name: "General", active: true }] as unknown as CategoryResponse[];

function draft(overrides: Partial<PurchaseItemDraft> = {}): PurchaseItemDraft {
  return {
    rowId: "row-1",
    productId: "p-1",
    quantity: 2,
    unitCost: "40.00",
    taxRate: "18",
    discountAmount: "0",
    ...overrides,
  };
}

function renderRow(overrides: Partial<Parameters<typeof PurchaseItemRow>[0]> = {}) {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  renderWithProviders(
    <PurchaseItemRow
      item={draft()}
      products={PRODUCTS}
      categories={CATEGORIES}
      canCreateProduct={false}
      canRemove
      onChange={onChange}
      onRemove={onRemove}
      {...overrides}
    />
  );
  return { onChange, onRemove };
}

describe("PurchaseItemRow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the line as it stands", () => {
    renderRow();

    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("40.00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("18")).toBeInTheDocument();
  });

  it("reports the picked product to the dialog", async () => {
    const { onChange } = renderRow();

    await userEvent.selectOptions(screen.getByRole("combobox"), "p-2");

    expect(onChange).toHaveBeenCalledWith({ productId: "p-2" });
  });

  it("reports the quantity as a number, not as the raw input text", async () => {
    const { onChange } = renderRow({ item: draft({ quantity: 1 }) });

    await userEvent.type(screen.getByDisplayValue("1"), "2");

    expect(onChange).toHaveBeenCalledWith({ quantity: 12 });
  });

  it("reports edits to cost, tax and discount", async () => {
    const { onChange } = renderRow({ item: draft({ unitCost: "4", taxRate: "1", discountAmount: "0" }) });

    await userEvent.type(screen.getByDisplayValue("4"), "5");
    await userEvent.type(screen.getByDisplayValue("1"), "8");
    await userEvent.type(screen.getByDisplayValue("0"), "3");

    expect(onChange).toHaveBeenCalledWith({ unitCost: "45" });
    expect(onChange).toHaveBeenCalledWith({ taxRate: "18" });
    // A number input normalises the leading zero away before the change reaches the handler.
    expect(onChange).toHaveBeenCalledWith({ discountAmount: "3" });
  });

  it("removes the line on request", async () => {
    const { onRemove } = renderRow();

    await userEvent.click(screen.getByRole("button", { name: "Quitar" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("blocks removing the last line, so the purchase always has one", () => {
    renderRow({ canRemove: false });

    expect(screen.getByRole("button", { name: "Quitar" })).toBeDisabled();
  });

  it("offers the quick-create shortcut only to users allowed to create products", () => {
    renderRow({ canCreateProduct: true });

    expect(screen.getByRole("button", { name: /Nuevo/ })).toBeInTheDocument();
  });

  it("hides the quick-create shortcut without the permission", () => {
    renderRow({ canCreateProduct: false });

    expect(screen.queryByRole("button", { name: /Nuevo/ })).not.toBeInTheDocument();
  });
});
