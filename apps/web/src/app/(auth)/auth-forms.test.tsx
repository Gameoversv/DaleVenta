import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/test/render";
import LoginPage from "./login/page";
import RegisterPage from "./register/page";

/**
 * The one rule both entry forms share: an address that is not an address never reaches the API.
 *
 * Both screens validate with a Zod schema before submitting, and the email rule is the only one
 * a user can get wrong while still filling every field. Everything else about these forms is
 * react-hook-form's job.
 *
 * The bad address is domain-without-a-dot rather than something obviously broken: the field is
 * type="email", so the browser refuses to submit anything it already considers malformed, and the
 * schema would never be reached. What is left for Zod is exactly this — addresses HTML accepts.
 */

const login = vi.fn();
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ login }) }));

const post = vi.fn();
vi.mock("@/lib/api", () => ({ default: { post: (...args: unknown[]) => post(...args) } }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => {
  login.mockReset();
  post.mockReset();
});

describe("login", () => {
  it("does not attempt to sign in with a malformed address", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/correo/i), "ada@dalventa");
    await user.type(screen.getByLabelText(/contrasena/i), "secret123");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByText("Correo invalido")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("signs in with the credentials as typed", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/correo/i), "ada@dalventa.test");
    await user.type(screen.getByLabelText(/contrasena/i), "secret123");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(login).toHaveBeenCalledWith("ada@dalventa.test", "secret123");
  });
});

describe("register", () => {
  it("does not register a business under a malformed address", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText(/nombre del negocio/i), "Colmado Ada");
    await user.type(screen.getByLabelText(/tu nombre/i), "Ada Admin");
    await user.type(screen.getByLabelText(/correo/i), "ada@dalventa");
    await user.type(screen.getByLabelText(/^contrasena$/i), "secret123");
    await user.click(screen.getByRole("button", { name: /registrar/i }));

    expect(await screen.findByText("Correo invalido")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
});
