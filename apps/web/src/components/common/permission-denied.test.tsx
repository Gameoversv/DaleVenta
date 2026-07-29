import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/test/render";
import { PermissionDenied } from "./permission-denied";

describe("PermissionDenied", () => {
  it("still names the screen the viewer was refused", () => {
    renderWithProviders(<PermissionDenied title="Auditoria" message="No tienes permiso para ver auditoria." />);

    expect(screen.getByRole("heading", { level: 1, name: "Auditoria" })).toBeInTheDocument();
  });

  it("explains what is missing", () => {
    renderWithProviders(<PermissionDenied title="Compras" message="No tienes permiso para consultar compras." />);

    expect(screen.getByText("No tienes permiso para consultar compras.")).toBeInTheDocument();
  });

  it("renders no actions, so a refused screen offers no way around the gate", () => {
    renderWithProviders(<PermissionDenied title="Usuarios" message="No tienes permiso para administrar usuarios." />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
