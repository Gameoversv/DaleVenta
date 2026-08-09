import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import SuperAdminTenantDetailPage from "./page";
import { tenantDetail } from "./tenant-fixtures";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
vi.mock("@/lib/api", () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
  },
}));

const success = vi.fn();
const error = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (m: string) => success(m), error: (m: string) => error(m) } }));

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "t-1" }) }));

const assign = vi.fn();

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: { data: tenantDetail() } });
  post.mockReset();
  post.mockResolvedValue({ data: { data: null } });
  patch.mockReset();
  patch.mockResolvedValue({ data: { data: null } });
  success.mockReset();
  error.mockReset();
  assign.mockReset();
  localStorage.clear();
  // jsdom cannot navigate; the impersonation only needs the call to be observable.
  Object.defineProperty(window, "location", { value: { assign }, writable: true });
});

describe("SuperAdminTenantDetailPage", () => {
  it("waits rather than showing an empty tenant", () => {
    get.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SuperAdminTenantDetailPage />);

    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("says so when the tenant cannot be loaded", async () => {
    get.mockRejectedValue(new Error("boom"));
    renderWithProviders(<SuperAdminTenantDetailPage />);

    expect(await screen.findByText("No se pudo cargar el tenant.")).toBeInTheDocument();
  });

  it("titles itself with the tenant and its status", async () => {
    renderWithProviders(<SuperAdminTenantDetailPage />);

    expect(await screen.findByRole("heading", { level: 1, name: "Ferreteria Central" })).toBeInTheDocument();
    expect(screen.getByText("ferreteria-central")).toBeInTheDocument();
    // Also an option of the status select, so the badge is picked out by its element.
    expect(screen.getAllByText("TRIAL").some((node) => node.tagName === "SPAN")).toBe(true);
  });

  it("offers approval only while the tenant is waiting for it", async () => {
    renderWithProviders(<SuperAdminTenantDetailPage />);

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
  });

  it("approves a pending tenant", async () => {
    get.mockResolvedValue({ data: { data: tenantDetail({ status: "PENDING" }) } });
    const user = userEvent.setup();
    renderWithProviders(<SuperAdminTenantDetailPage />);

    await user.click(await screen.findByRole("button", { name: "Aprobar" }));

    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/super-admin/tenants/t-1/approve"));
    await waitFor(() => expect(success).toHaveBeenCalledWith("Tenant aprobado"));
  });

  it("takes over the impersonation token and lands on the tenant dashboard", async () => {
    post.mockResolvedValue({ data: { data: { token: "impersonation-token", tenantName: "Ferreteria Central" } } });
    const user = userEvent.setup();
    renderWithProviders(<SuperAdminTenantDetailPage />);

    await user.click(await screen.findByRole("button", { name: "Impersonar" }));

    await waitFor(() => expect(localStorage.getItem("token")).toBe("impersonation-token"));
    expect(assign).toHaveBeenCalledWith("/dashboard");
    expect(success).toHaveBeenCalledWith("Sesion iniciada como Ferreteria Central");
  });

  it("says what the API refused the impersonation with", async () => {
    post.mockRejectedValue({ response: { data: { error: "Tenant suspendido" } } });
    const user = userEvent.setup();
    renderWithProviders(<SuperAdminTenantDetailPage />);

    await user.click(await screen.findByRole("button", { name: "Impersonar" }));

    await waitFor(() => expect(error).toHaveBeenCalledWith("Tenant suspendido"));
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("puts up the three panels the screen is made of", async () => {
    renderWithProviders(<SuperAdminTenantDetailPage />);

    expect(await screen.findByText("Informacion")).toBeInTheDocument();
    expect(screen.getByText("Estado y plan")).toBeInTheDocument();
    expect(screen.getByText("Administradores")).toBeInTheDocument();
  });
});
