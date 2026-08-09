import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { TenantStatusPlanCard } from "./TenantStatusPlanCard";
import { tenantDetail } from "./tenant-fixtures";
import { TENANT_MODULES } from "./tenant-modules";

const patch = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api", () => ({
  default: { patch: (...args: unknown[]) => patch(...args), post: (...args: unknown[]) => post(...args) },
}));

const success = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (m: string) => success(m), error: vi.fn() } }));

beforeEach(() => {
  patch.mockReset();
  patch.mockResolvedValue({ data: { data: null } });
  post.mockReset();
  success.mockReset();
});

describe("TenantStatusPlanCard", () => {
  it("starts from the status and plan the tenant is on", () => {
    renderWithProviders(<TenantStatusPlanCard tenant={tenantDetail()} />);

    expect(screen.getByLabelText("Estado")).toHaveValue("TRIAL");
    expect(screen.getByLabelText("Plan")).toHaveValue("STARTER");
  });

  it("moves the tenant to the status that was picked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TenantStatusPlanCard tenant={tenantDetail()} />);

    await user.selectOptions(screen.getByLabelText("Estado"), "SUSPENDED");

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/super-admin/tenants/t-1/status", { status: "SUSPENDED" })
    );
    await waitFor(() => expect(success).toHaveBeenCalledWith("Estado actualizado"));
  });

  it("moves the tenant to the plan that was picked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TenantStatusPlanCard tenant={tenantDetail()} />);

    await user.selectOptions(screen.getByLabelText("Plan"), "ENTERPRISE");

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/super-admin/tenants/t-1/plan", { plan: "ENTERPRISE" })
    );
    await waitFor(() => expect(success).toHaveBeenCalledWith("Plan actualizado"));
  });

  it("offers a switch for every optional module", () => {
    renderWithProviders(<TenantStatusPlanCard tenant={tenantDetail()} />);

    for (const tenantModule of TENANT_MODULES) {
      expect(screen.getByText(tenantModule.title)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: "Activar" })).toHaveLength(TENANT_MODULES.length);
  });

  it("shows a bought module as one that can be turned off", () => {
    renderWithProviders(<TenantStatusPlanCard tenant={tenantDetail({ purchaseModuleEnabled: true })} />);

    expect(screen.getAllByRole("button", { name: "Desactivar" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Activar" })).toHaveLength(TENANT_MODULES.length - 1);
  });

  it("keeps the trial extension within reach of the plan it applies to", () => {
    renderWithProviders(<TenantStatusPlanCard tenant={tenantDetail()} />);

    expect(screen.getByRole("button", { name: "Extender trial" })).toBeInTheDocument();
  });
});
