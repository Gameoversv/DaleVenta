import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen } from "@/test/render";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("hides the value until the viewer asks to see it", () => {
    renderWithProviders(<PasswordInput id="pw" value="Secret123!" onChange={() => {}} />);

    expect(screen.getByLabelText("Mostrar contrasena")).toBeInTheDocument();
    expect(document.getElementById("pw")).toHaveAttribute("type", "password");
  });

  // Edge dibuja su propio boton de revelar, pero solo mientras el campo tiene
  // foco y contenido: por eso el cliente veia el ojito aparecer y desaparecer.
  it("keeps its toggle visible with an empty field and without focus", () => {
    renderWithProviders(<PasswordInput id="pw" value="" onChange={() => {}} />);

    expect(screen.getByRole("button", { name: "Mostrar contrasena" })).toBeVisible();
  });

  it("reveals the value and offers to hide it again", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PasswordInput id="pw" value="Secret123!" onChange={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Mostrar contrasena" }));

    expect(document.getElementById("pw")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar contrasena" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Ocultar contrasena" }));

    expect(document.getElementById("pw")).toHaveAttribute("type", "password");
  });

  it("does not submit the form it sits in", () => {
    renderWithProviders(<PasswordInput id="pw" value="" onChange={() => {}} />);

    expect(screen.getByRole("button", { name: "Mostrar contrasena" })).toHaveAttribute("type", "button");
  });
});
