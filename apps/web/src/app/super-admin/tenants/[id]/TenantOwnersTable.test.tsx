import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/test/render";
import { TenantOwnersTable } from "./TenantOwnersTable";
import type { UserSummaryResponse } from "@/types/superadmin";

function owner(overrides: Partial<UserSummaryResponse> = {}): UserSummaryResponse {
  return {
    id: "u-1",
    name: "Ada Admin",
    email: "ada@ferreteria.test",
    role: "ADMIN",
    tenantId: "t-1",
    active: true,
    createdAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("TenantOwnersTable", () => {
  it("says so when a tenant has nobody who can administer it", () => {
    renderWithProviders(<TenantOwnersTable owners={[]} />);

    expect(screen.getByText("Este tenant no tiene administradores.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("lists each administrator with their email", () => {
    renderWithProviders(
      <TenantOwnersTable owners={[owner(), owner({ id: "u-2", name: "Beto", email: "beto@ferreteria.test" })]} />
    );

    expect(screen.getAllByRole("row")).toHaveLength(3); // header plus two owners
    expect(screen.getByText("ada@ferreteria.test")).toBeInTheDocument();
    expect(screen.getByText("beto@ferreteria.test")).toBeInTheDocument();
  });

  it("marks a deactivated administrator apart from a working one", () => {
    renderWithProviders(<TenantOwnersTable owners={[owner(), owner({ id: "u-2", active: false })]} />);

    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });
});
