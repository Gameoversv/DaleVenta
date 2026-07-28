import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { OpenShiftForm } from "./OpenShiftForm";
import type { DenominationResponse } from "@/types/cash-shift";
import type { TenantFeatures } from "@/types/auth";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api", () => ({
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}));

let contextFeatures: TenantFeatures;
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ tenantFeatures: contextFeatures }) }));

vi.mock("./InventoryCountGrid", () => ({ InventoryCountGrid: () => <div /> }));
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

function setup() {
  renderWithProviders(<OpenShiftForm registerId="r-1" branchId="b-1" />);
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  mockApi(true);
});

describe("OpenShiftForm counting by denomination", () => {
  it("will not open a shift before the drawer is counted", async () => {
    setup();

    expect(await screen.findByRole("button", { name: /abrir turno/i })).toBeDisabled();
  });

  it("shows the running opening float as the cashier counts", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(await screen.findByLabelText("RD$500"), "4");

    expect(screen.getByText("RD$2,000.00")).toBeInTheDocument();
  });

  it("sends the counted denominations and no opening amount", async () => {
    post.mockResolvedValue({ data: { data: {} } });
    const user = userEvent.setup();
    setup();

    await user.type(await screen.findByLabelText("RD$500"), "4");
    await user.click(screen.getByRole("button", { name: /abrir turno/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][0]).toBe("/api/cash-shifts/open");
    expect(post.mock.calls[0][1]).toMatchObject({
      registerId: "r-1",
      openingAmount: undefined,
      openingCounts: [{ denominationId: "d500", quantity: 4 }],
    });
  });
});

describe("OpenShiftForm counting a single amount", () => {
  beforeEach(() => mockApi(false));

  it("asks for one float instead of a denomination grid", async () => {
    setup();

    expect(await screen.findByLabelText(/fondo inicial/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("RD$500")).not.toBeInTheDocument();
  });

  it("accepts a float of zero, which is a legitimate way to open", async () => {
    post.mockResolvedValue({ data: { data: {} } });
    const user = userEvent.setup();
    setup();

    await user.type(await screen.findByLabelText(/fondo inicial/i), "0");
    await user.click(screen.getByRole("button", { name: /abrir turno/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    // A register can legitimately start empty; only a blank field blocks opening.
    expect(post.mock.calls[0][1]).toMatchObject({ openingAmount: "0.00", openingCounts: [] });
  });

  it("stays blocked while the field is blank", async () => {
    setup();

    expect(await screen.findByRole("button", { name: /abrir turno/i })).toBeDisabled();
  });

  it("sends the float as a decimal string the backend can parse", async () => {
    post.mockResolvedValue({ data: { data: {} } });
    const user = userEvent.setup();
    setup();

    await user.type(await screen.findByLabelText(/fondo inicial/i), "1500.5");
    await user.click(screen.getByRole("button", { name: /abrir turno/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][1].openingAmount).toBe("1500.50");
  });

  it("refuses a negative float", async () => {
    post.mockResolvedValue({ data: { data: {} } });
    const user = userEvent.setup();
    setup();

    await user.type(await screen.findByLabelText(/fondo inicial/i), "-500");
    await user.click(screen.getByRole("button", { name: /abrir turno/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    // Clamped rather than rejected, so a stray minus cannot open the shift in debt.
    expect(post.mock.calls[0][1].openingAmount).toBe("0.00");
  });
});
