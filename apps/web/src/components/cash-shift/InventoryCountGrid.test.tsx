import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { InventoryCountGrid } from "./InventoryCountGrid";
import type { ProductResponse } from "@/types/product";

const get = vi.fn();
vi.mock("@/lib/api", () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

function product(overrides: Partial<ProductResponse> = {}): ProductResponse {
  return {
    id: "p-1",
    categoryId: "c-1",
    internalCode: "BIZ-001",
    barcode: "7501234567890",
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

const PRODUCTS = [
  product(),
  product({ id: "p-2", internalCode: "PAN-001", barcode: null, description: "Pan de agua" }),
  // A service-style product: sold, but never counted.
  product({ id: "p-3", internalCode: "SRV-001", barcode: null, description: "Servicio", tracksInventory: false }),
];

const INVENTORY = [
  { productId: "p-1", currentStock: 50, minStock: null, maxStock: null },
  { productId: "p-2", currentStock: 12, minStock: null, maxStock: null },
  { productId: "p-3", currentStock: 0, minStock: null, maxStock: null },
];

function mockApi() {
  get.mockImplementation((url: string) =>
    url.startsWith("/api/inventory/branch")
      ? Promise.resolve({ data: { data: INVENTORY } })
      : Promise.resolve({ data: { data: PRODUCTS } })
  );
}

function setup() {
  const onChange = vi.fn();
  renderWithProviders(<InventoryCountGrid branchId="b-1" onChange={onChange} />);
  return { onChange };
}

beforeEach(() => {
  get.mockReset();
  mockApi();
});

describe("InventoryCountGrid", () => {
  it("counts only the products that track stock", async () => {
    setup();

    expect(await screen.findByLabelText(/bizcocho/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pan de agua/i)).toBeInTheDocument();
    // Counting a product that tracks no stock would record a phantom adjustment.
    expect(screen.queryByLabelText(/servicio/i)).not.toBeInTheDocument();
  });

  it("starts each field at the stock the system believes it has", async () => {
    setup();

    expect(await screen.findByLabelText(/bizcocho/i)).toHaveValue(50);
    expect(screen.getByLabelText(/pan de agua/i)).toHaveValue(12);
  });

  it("reports every tracked product, so an untouched line still counts as confirmed", async () => {
    const { onChange } = setup();

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          { productId: "p-1", quantity: 50 },
          { productId: "p-2", quantity: 12 },
        ])
      )
    );
    expect(onChange.mock.calls.at(-1)![0]).toHaveLength(2);
  });

  it("sends the corrected quantity when the cashier finds a different amount", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    const field = await screen.findByLabelText(/bizcocho/i);
    await user.clear(field);
    await user.type(field, "47");

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.arrayContaining([{ productId: "p-1", quantity: 47 }])
      )
    );
  });

  it("accepts a count of zero, which is how a stockout is recorded", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    const field = await screen.findByLabelText(/bizcocho/i);
    await user.clear(field);
    await user.type(field, "0");

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.arrayContaining([{ productId: "p-1", quantity: 0 }])
      )
    );
  });

  it("shows how many products the search narrowed the list to", async () => {
    const user = userEvent.setup();
    setup();

    expect(await screen.findByText("2 de 2 productos")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/buscar producto/i), "pan");
    expect(screen.getByText("1 de 2 productos")).toBeInTheDocument();
  });

  it("searches by internal code and barcode too", async () => {
    const user = userEvent.setup();
    setup();

    const search = await screen.findByPlaceholderText(/buscar producto/i);
    await user.type(search, "PAN-001");
    expect(screen.getByLabelText(/pan de agua/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/bizcocho/i)).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "7501234567890");
    expect(screen.getByLabelText(/bizcocho/i)).toBeInTheDocument();
  });

  it("keeps a count already entered when the search hides and shows the row again", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    const field = await screen.findByLabelText(/bizcocho/i);
    await user.clear(field);
    await user.type(field, "44");

    const search = screen.getByPlaceholderText(/buscar producto/i);
    await user.type(search, "pan");
    await user.clear(search);

    // Losing the count on a filter change would silently discard the cashier's work.
    expect(await screen.findByLabelText(/bizcocho/i)).toHaveValue(44);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.arrayContaining([{ productId: "p-1", quantity: 44 }])
    );
  });

  it("says nothing matched rather than showing an empty grid", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(await screen.findByPlaceholderText(/buscar producto/i), "zzz");

    expect(screen.getByText(/ningun producto coincide/i)).toBeInTheDocument();
  });
});
