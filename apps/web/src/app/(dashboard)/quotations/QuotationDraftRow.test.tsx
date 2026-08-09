import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/test/render";
import { QuotationDraftRow } from "./page";
import type { ProductResponse } from "@/types/product";
import type { QuotationItemRequest } from "@/types/quotation";

vi.mock("@/lib/api", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const PRODUCT = {
  id: "p-1",
  description: "Harina",
  unit: "kg",
  salePrice: "60.00",
  wholesalePrice: "45.00",
} as unknown as ProductResponse;

function item(overrides: Partial<QuotationItemRequest> = {}): QuotationItemRequest {
  return { productId: "p-1", quantity: 3, useWholesalePrice: false, ...overrides };
}

function renderRow(props: Partial<Parameters<typeof QuotationDraftRow>[0]> = {}) {
  const onRemove = vi.fn();
  renderWithProviders(
    <table>
      <tbody>
        <QuotationDraftRow item={item()} product={PRODUCT} onRemove={onRemove} {...props} />
      </tbody>
    </table>
  );
  return { onRemove };
}

describe("QuotationDraftRow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("quotes the retail price by default", () => {
    renderRow();

    expect(screen.getByText("Harina")).toBeInTheDocument();
    expect(screen.getByText("RD$60.00")).toBeInTheDocument();
  });

  it("quotes the wholesale price when the line asks for it", () => {
    renderRow({ item: item({ useWholesalePrice: true }) });

    expect(screen.getByText("RD$45.00")).toBeInTheDocument();
  });

  it("falls back to the product id when the product is gone", () => {
    renderRow({ product: undefined });

    expect(screen.getByText("p-1")).toBeInTheDocument();
  });

  it("removes the line on request", async () => {
    const { onRemove } = renderRow();

    await userEvent.click(screen.getByRole("button", { name: "Quitar producto" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
