import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { TenantModuleToggle } from "./TenantModuleToggle";
import { TENANT_MODULES } from "./tenant-modules";

const patch = vi.fn();
vi.mock("@/lib/api", () => ({ default: { patch: (...args: unknown[]) => patch(...args) } }));

const success = vi.fn();
const error = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (m: string) => success(m), error: (m: string) => error(m) } }));

const FISCAL = TENANT_MODULES[0];
const RENTALS = TENANT_MODULES.find((module) => module.key === "rentalModuleEnabled")!;

function setup(module = FISCAL, enabled = false) {
  renderWithProviders(<TenantModuleToggle tenantId="t-1" module={module} enabled={enabled} />);
}

beforeEach(() => {
  patch.mockReset();
  patch.mockResolvedValue({ data: { data: null } });
  success.mockReset();
  error.mockReset();
});

describe("TenantModuleToggle", () => {
  it("describes the module it switches", () => {
    setup();

    expect(screen.getByText(FISCAL.title)).toBeInTheDocument();
    expect(screen.getByText(FISCAL.description)).toBeInTheDocument();
  });

  it("offers to turn a module on when it is off", () => {
    setup(FISCAL, false);

    expect(screen.getByRole("button", { name: "Activar" })).toBeInTheDocument();
  });

  it("offers to turn a module off when it is on", () => {
    setup(FISCAL, true);

    expect(screen.getByRole("button", { name: "Desactivar" })).toBeInTheDocument();
  });

  it("sends the opposite of the state it was given, to the endpoint of its module", async () => {
    const user = userEvent.setup();
    setup(RENTALS, true);

    await user.click(screen.getByRole("button", { name: "Desactivar" }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/super-admin/tenants/t-1/rental-module", { enabled: false })
    );
  });

  it("confirms the switch in the wording of its own module", async () => {
    const user = userEvent.setup();
    setup(RENTALS, false);

    await user.click(screen.getByRole("button", { name: "Activar" }));

    await waitFor(() => expect(success).toHaveBeenCalledWith("Modulo de alquileres actualizado"));
  });

  it("surfaces what the API said when the switch is refused", async () => {
    patch.mockRejectedValue({ response: { data: { error: "El plan no incluye este modulo" } } });
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Activar" }));

    await waitFor(() => expect(error).toHaveBeenCalledWith("El plan no incluye este modulo"));
    expect(success).not.toHaveBeenCalled();
  });

  it("locks the switch while the change is in flight", async () => {
    patch.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Activar" }));

    expect(await screen.findByRole("button", { name: "Actualizando..." })).toBeDisabled();
  });
});
