import { describe, expect, it, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { adminUser, dashboardGet, NO_PERMISSIONS } from "@/test/dashboard-fixtures";
import SettingsPage from "./page";

/**
 * The denomination dialog, reached the way an administrator reaches it.
 *
 * The dialog is not exported: it only exists behind SETTINGS_MANAGE and a tenant with cash
 * denominations turned on. Rendering it directly would test a component no user can reach in that
 * state, so the tests walk in through the settings screen and pay the two gates on the way.
 */

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api", () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    put: vi.fn(() => Promise.resolve({ data: { data: null } })),
  },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: adminUser(),
    permissions: NO_PERMISSIONS,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

async function openDenominationDialog() {
  const user = userEvent.setup();
  renderWithProviders(<SettingsPage />);
  await user.click(await screen.findByRole("button", { name: /nueva denominacion/i }));
  await screen.findByLabelText(/valor/i);
  return user;
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  get.mockImplementation((url: string) => dashboardGet(url));
  post.mockResolvedValue({ data: { data: null } });
  vi.mocked(toast.error).mockReset();
  vi.mocked(toast.success).mockReset();
});

describe("denominations settings", () => {
  /**
   * An empty field is the only invalid value that reaches the guard. The input is type="number"
   * with min="0.01", so the browser swallows the lone minus sign of a negative and refuses to
   * submit a zero at all. The guard still has to hold: it is what stands between an empty form and
   * a denomination worth 0 in the register.
   */
  it("refuses a denomination worth nothing", async () => {
    const user = await openDenominationDialog();

    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(toast.error).toHaveBeenCalledWith("El valor debe ser mayor que cero");
    expect(post).not.toHaveBeenCalled();
  });

  it("stores the value with cents, so 20.5 and 20.50 are the same denomination", async () => {
    const user = await openDenominationDialog();

    await user.type(screen.getByLabelText(/valor/i), "20.5");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][0]).toBe("/api/denominations");
    expect(post.mock.calls[0][1]).toEqual({ value: "20.50", type: "BILL" });
  });

  it("keeps the kind of currency the administrator picked", async () => {
    const user = await openDenominationDialog();

    await user.type(screen.getByLabelText(/valor/i), "5");
    await user.selectOptions(screen.getByLabelText(/tipo/i), "COIN");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][1]).toEqual({ value: "5.00", type: "COIN" });
  });
});
