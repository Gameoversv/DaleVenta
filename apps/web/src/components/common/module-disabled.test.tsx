import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/test/render";
import { ModuleDisabled } from "./module-disabled";

describe("ModuleDisabled", () => {
  it("still names the screen the module belongs to", () => {
    renderWithProviders(<ModuleDisabled title="Compras" />);

    expect(screen.getByRole("heading", { level: 1, name: "Compras" })).toBeInTheDocument();
  });

  it("blames the tenant feature rather than the user's permissions", () => {
    renderWithProviders(<ModuleDisabled title="Fiscal" />);

    expect(screen.getByText("Este modulo no esta activo para este tenant.")).toBeInTheDocument();
  });

  it("accepts more specific wording when a screen has it", () => {
    renderWithProviders(<ModuleDisabled title="Alquileres" message="Alquileres no esta incluido en tu plan." />);

    expect(screen.getByText("Alquileres no esta incluido en tu plan.")).toBeInTheDocument();
  });
});
