import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/test/render";
import { ProductSearchPanel } from "./ProductSearchPanel";
import type { ProductResponse } from "@/types/product";
import type { TenantFeatures } from "@/types/auth";

const get = vi.fn();
vi.mock("@/lib/api", () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

let features: TenantFeatures;
vi.mock("@/hooks/useTenantFeatures", () => ({ useTenantFeatures: () => features }));

function product(overrides: Partial<ProductResponse> = {}): ProductResponse {
  return {
    id: "p-1",
    categoryId: "c-1",
    internalCode: "BIZ-001",
    barcode: "7501234567890",
    description: "Bizcocho de chocolate",
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

const CATALOG = [
  product(),
  product({ id: "p-2", categoryId: "c-2", internalCode: "PAN-001", barcode: null, description: "Pan de agua" }),
  product({ id: "p-3", categoryId: "c-1", internalCode: "REN-001", barcode: null, description: "Bandeja", rentable: true }),
];

function setup(products = CATALOG) {
  const onSelect = vi.fn();
  renderWithProviders(<ProductSearchPanel products={products} onSelect={onSelect} />);
  return { onSelect };
}

beforeEach(() => {
  get.mockReset();
  features = {
    fiscalModuleEnabled: false,
    cashDenominationsEnabled: true,
    multiBranchEnabled: false,
    multiRegisterEnabled: false,
    rentalModuleEnabled: false,
    purchaseModuleEnabled: false,
  };
  get.mockResolvedValue({
    data: { data: [{ id: "c-1", name: "Bizcochos", active: true }, { id: "c-2", name: "Panes", active: true }] },
  });
});

describe("ProductSearchPanel", () => {
  it("lists every product before the cashier types", async () => {
    setup();

    expect(await screen.findByText("Bizcocho de chocolate")).toBeInTheDocument();
    expect(screen.getByText("Pan de agua")).toBeInTheDocument();
  });

  it("searches by description, ignoring case", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByPlaceholderText(/buscar producto/i), "PAN");

    expect(screen.getByText("Pan de agua")).toBeInTheDocument();
    expect(screen.queryByText("Bizcocho de chocolate")).not.toBeInTheDocument();
  });

  it("searches by internal code", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByPlaceholderText(/buscar producto/i), "REN-001");

    expect(screen.getByText("Bandeja")).toBeInTheDocument();
    expect(screen.queryByText("Pan de agua")).not.toBeInTheDocument();
  });

  it("searches by barcode, which is how a scanner enters a product", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByPlaceholderText(/buscar producto/i), "7501234567890");

    expect(screen.getByText("Bizcocho de chocolate")).toBeInTheDocument();
    expect(screen.queryByText("Pan de agua")).not.toBeInTheDocument();
  });

  it("ignores surrounding whitespace, which a scanner often appends", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByPlaceholderText(/buscar producto/i), "  pan  ");

    expect(screen.getByText("Pan de agua")).toBeInTheDocument();
  });

  it("says nothing matched rather than showing an empty grid", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByPlaceholderText(/buscar producto/i), "zzz");

    expect(screen.getByText(/ningun producto coincide/i)).toBeInTheDocument();
  });

  it("distinguishes an empty catalog from an unmatched search", () => {
    setup([]);

    expect(screen.getByText(/sin productos registrados/i)).toBeInTheDocument();
  });

  it("filters by category chip and back to all", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole("button", { name: "Panes" }));
    expect(screen.getByText("Pan de agua")).toBeInTheDocument();
    expect(screen.queryByText("Bizcocho de chocolate")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Todos" }));
    expect(screen.getByText("Bizcocho de chocolate")).toBeInTheDocument();
  });

  it("hides the rentals chip while the module is off", async () => {
    setup();

    await screen.findByRole("button", { name: "Todos" });
    expect(screen.queryByRole("button", { name: "Alquileres" })).not.toBeInTheDocument();
  });

  it("offers a rentals chip that narrows to rentable products", async () => {
    features = { ...features, rentalModuleEnabled: true };
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole("button", { name: "Alquileres" }));

    expect(screen.getByText("Bandeja")).toBeInTheDocument();
    expect(screen.queryByText("Pan de agua")).not.toBeInTheDocument();
  });

  it("hands the chosen product to the cart", async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();

    await user.click(await screen.findByText("Pan de agua"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: "p-2" });
  });

  it("caps the grid so a large catalog cannot stall the register", async () => {
    const many = Array.from({ length: 80 }, (_, i) =>
      product({ id: `p-${i}`, internalCode: `COD-${i}`, description: `Producto ${i}` })
    );
    setup(many);

    await screen.findByText("Producto 0");
    expect(screen.getByText("Producto 59")).toBeInTheDocument();
    expect(screen.queryByText("Producto 60")).not.toBeInTheDocument();
  });
});
