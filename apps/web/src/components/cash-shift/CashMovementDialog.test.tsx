import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor, within } from "@/test/render";
import { CashMovementDialog } from "./CashMovementDialog";
import type { DenominationResponse } from "@/types/cash-shift";
import type { TenantFeatures } from "@/types/auth";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api", () => ({
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}));

let contextFeatures: TenantFeatures;
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ tenantFeatures: contextFeatures }) }));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const DENOMINATIONS: DenominationResponse[] = [
  { id: "d500", value: "500.00", type: "BILL", active: true },
  { id: "d100", value: "100.00", type: "BILL", active: true },
];

function features(cashDenominationsEnabled: boolean): TenantFeatures {
  return {
    fiscalModuleEnabled: false,
    cashDenominationsEnabled,
    multiBranchEnabled: false,
    multiRegisterEnabled: false,
    rentalModuleEnabled: false,
    purchaseModuleEnabled: false,
  };
}

function mockApi(denominationsEnabled: boolean) {
  contextFeatures = features(denominationsEnabled);
  get.mockImplementation((url: string) =>
    url === "/api/denominations"
      ? Promise.resolve({ data: { data: DENOMINATIONS } })
      : Promise.resolve({ data: { data: features(denominationsEnabled) } })
  );
}

async function openDialog() {
  const user = userEvent.setup();
  renderWithProviders(
    <CashMovementDialog cashShiftId="s-1" registerId="r-1" trigger={<button>Movimiento</button>} />
  );
  await user.click(screen.getByRole("button", { name: "Movimiento" }));
  return user;
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  mockApi(false);
});

describe("CashMovementDialog", () => {
  it("offers the three kinds of movement a register records", async () => {
    await openDialog();

    const type = await screen.findByLabelText(/tipo/i);
    expect(within(type).getByRole("option", { name: "Entrada" })).toBeInTheDocument();
    expect(within(type).getByRole("option", { name: "Retiro" })).toBeInTheDocument();
    expect(within(type).getByRole("option", { name: "Gasto" })).toBeInTheDocument();
  });

  it("requires a reason, so no movement is untraceable", async () => {
    const user = await openDialog();

    await user.type(await screen.findByLabelText(/monto/i), "500");
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/motivo/i), "Pago a proveedor");
    expect(screen.getByRole("button", { name: /guardar/i })).toBeEnabled();
  });

  it("requires an amount above zero", async () => {
    const user = await openDialog();

    await user.type(await screen.findByLabelText(/motivo/i), "Pago a proveedor");
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/monto/i), "0");
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("posts the movement with its type, reason and amount", async () => {
    post.mockResolvedValue({ data: {} });
    const user = await openDialog();

    await user.selectOptions(await screen.findByLabelText(/tipo/i), "WITHDRAWAL");
    await user.type(screen.getByLabelText(/motivo/i), "Deposito bancario");
    await user.type(screen.getByLabelText(/monto/i), "1500");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][0]).toBe("/api/cash-shifts/s-1/movements");
    expect(post.mock.calls[0][1]).toMatchObject({
      type: "WITHDRAWAL",
      reason: "Deposito bancario",
      amount: "1500",
      denominations: [],
    });
  });

  it("counts by denomination when the tenant works that way", async () => {
    mockApi(true);
    post.mockResolvedValue({ data: {} });
    const user = await openDialog();

    await user.type(await screen.findByLabelText(/motivo/i), "Fondo inicial");
    await user.type(await screen.findByLabelText("RD$500"), "2");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    // The amount is derived from the counted bills, so it must not also be sent.
    expect(post.mock.calls[0][1]).toMatchObject({
      amount: undefined,
      denominations: [{ denominationId: "d500", quantity: 2 }],
    });
  });

  it("keeps the movement from being recorded until something is counted", async () => {
    mockApi(true);
    const user = await openDialog();

    await user.type(await screen.findByLabelText(/motivo/i), "Fondo inicial");

    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });
});
