import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { ProductTable } from "./ProductTable";
import type { ProductResponse } from "@/types/product";
import type { PermissionCode, TenantFeatures } from "@/types/auth";

const get = vi.fn();
const put = vi.fn();
vi.mock("@/lib/api", () => ({
  default: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a) },
}));

let permissions: PermissionCode[] = [];
vi.mock("@/hooks/usePermission", () => ({
  usePermission: (code: PermissionCode) => permissions.includes(code),
}));

let features: TenantFeatures;
vi.mock("@/hooks/useTenantFeatures", () => ({ useTenantFeatures: () => features }));

// The create/edit dialog has its own behaviour; here only its presence matters.
vi.mock("./ProductFormDialog", () => ({
  ProductFormDialog: ({ trigger }: { trigger?: React.ReactNode }) => <>{trigger ?? <button>Editar</button>}</>,
}));

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

const CATALOG = [
  product(),
  product({ id: "p-2", internalCode: "PAN-001", description: "Pan de agua", categoryId: "c-2" }),
  product({ id: "p-3", internalCode: "OLD-001", description: "Descontinuado", active: false }),
  product({ id: "p-4", internalCode: "REN-001", description: "Bandeja", rentable: true }),
];

beforeEach(() => {
  get.mockReset();
  put.mockReset();
  permissions = [];
  features = {
    fiscalModuleEnabled: false,
    cashDenominationsEnabled: true,
    multiBranchEnabled: false,
    multiRegisterEnabled: false,
    rentalModuleEnabled: false,
    purchaseModuleEnabled: false,
  };
  get.mockImplementation((url: string) =>
    url === "/api/products"
      ? Promise.resolve({ data: { data: CATALOG } })
      : Promise.resolve({ data: { data: [{ id: "c-1", name: "Bizcochos", active: true }] } })
  );
});

describe("ProductTable", () => {
  it("shows only active products by default", async () => {
    renderWithProviders(<ProductTable categoryId={null} />);

    await screen.findByText("Bizcocho");
    expect(screen.queryByText("Descontinuado")).not.toBeInTheDocument();
  });

  it("switches to inactive products, and then to all", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductTable categoryId={null} />);
    await screen.findByText("Bizcocho");

    const filter = screen.getByLabelText(/filtrar productos por estado/i);
    await user.selectOptions(filter, "inactive");

    expect(screen.getByText("Descontinuado")).toBeInTheDocument();
    expect(screen.queryByText("Bizcocho")).not.toBeInTheDocument();

    await user.selectOptions(filter, "all");
    expect(screen.getByText("Bizcocho")).toBeInTheDocument();
    expect(screen.getByText("Descontinuado")).toBeInTheDocument();
  });

  it("narrows the catalog to the selected category", async () => {
    renderWithProviders(<ProductTable categoryId="c-2" />);

    await screen.findByText("Pan de agua");
    expect(screen.queryByText("Bizcocho")).not.toBeInTheDocument();
  });

  it("says so when the filter leaves nothing", async () => {
    renderWithProviders(<ProductTable categoryId="c-999" />);

    expect(await screen.findByText(/no hay productos para el filtro/i)).toBeInTheDocument();
  });

  it("hides the create button from a user without INVENTORY_CREATE", async () => {
    renderWithProviders(<ProductTable categoryId={null} />);
    await screen.findByText("Bizcocho");

    expect(screen.queryByRole("button", { name: /nuevo producto/i })).not.toBeInTheDocument();
  });

  it("shows the create button once the permission is granted", async () => {
    permissions = ["INVENTORY_CREATE"];
    renderWithProviders(<ProductTable categoryId={null} />);
    await screen.findByText("Bizcocho");

    expect(screen.getByRole("button", { name: /nuevo producto/i })).toBeInTheDocument();
  });

  it("does not offer to deactivate a product without INVENTORY_EDIT", async () => {
    renderWithProviders(<ProductTable categoryId={null} />);

    await screen.findByText("Bizcocho");
    expect(screen.queryByRole("button", { name: /desactivar/i })).not.toBeInTheDocument();
  });

  it("offers to deactivate once INVENTORY_EDIT is granted", async () => {
    permissions = ["INVENTORY_EDIT"];
    renderWithProviders(<ProductTable categoryId={null} />);

    // The action column waits on the category list too, so query the button itself.
    expect((await screen.findAllByRole("button", { name: /desactivar/i })).length).toBeGreaterThan(0);
  });

  it("formats prices through the shared formatter", async () => {
    renderWithProviders(<ProductTable categoryId={null} />);

    await screen.findByText("Bizcocho");
    expect(screen.getAllByText("RD$100.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/RD\$250\.00/).length).toBeGreaterThan(0);
  });

  it("hides the rental badge while the tenant module is off", async () => {
    renderWithProviders(<ProductTable categoryId={null} />);

    await screen.findByText("Bandeja");
    expect(screen.queryByText("Alquiler")).not.toBeInTheDocument();
  });

  it("shows the rental badge only on rentable products once the module is on", async () => {
    features = { ...features, rentalModuleEnabled: true };
    renderWithProviders(<ProductTable categoryId={null} />);

    await screen.findByText("Bandeja");
    expect(screen.getAllByText("Alquiler")).toHaveLength(1);
  });

  it("sends the product back with its status flipped", async () => {
    permissions = ["INVENTORY_EDIT"];
    put.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderWithProviders(<ProductTable categoryId="c-1" />);
    await screen.findByText("Bizcocho");

    await user.click(screen.getAllByRole("button", { name: /desactivar/i })[0]);

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put.mock.calls[0][0]).toBe("/api/products/p-1");
    expect(put.mock.calls[0][1]).toMatchObject({ active: false, description: "Bizcocho" });
  });
});
