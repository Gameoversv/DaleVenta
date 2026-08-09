import { describe, expect, it } from "vitest";
import { renderWithProviders, screen, within } from "@/test/render";
import { TenantInfoCard } from "./TenantInfoCard";
import { tenantDetail } from "./tenant-fixtures";

function moduleRow(label: string) {
  return screen.getByText(`${label}:`, { exact: false }).closest("p")!;
}

describe("TenantInfoCard", () => {
  it("shows the contact details the tenant registered with", () => {
    renderWithProviders(<TenantInfoCard tenant={tenantDetail()} />);

    expect(screen.getByText("Santiago")).toBeInTheDocument();
    expect(screen.getByText("809-555-0100")).toBeInTheDocument();
    expect(screen.getByText("info@ferreteria.test")).toBeInTheDocument();
    expect(screen.getByText("131000000")).toBeInTheDocument();
  });

  it("dashes out the details a tenant never gave", () => {
    renderWithProviders(
      <TenantInfoCard tenant={tenantDetail({ city: null, phone: null, email: null, rnc: null })} />
    );

    expect(screen.getAllByText("-")).toHaveLength(4);
  });

  it("counts the users and customers the tenant has", () => {
    renderWithProviders(<TenantInfoCard tenant={tenantDetail()} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("lists every optional module as off", () => {
    renderWithProviders(<TenantInfoCard tenant={tenantDetail()} />);

    expect(within(moduleRow("Modulo fiscal")).getByText("Inactivo")).toBeInTheDocument();
    expect(within(moduleRow("Multisucursal")).getByText("Inactivo")).toBeInTheDocument();
    expect(within(moduleRow("Compras y proveedores")).getByText("Inactivo")).toBeInTheDocument();
  });

  it("keeps the wording each module uses for itself", () => {
    renderWithProviders(<TenantInfoCard tenant={tenantDetail({ cashDenominationsEnabled: true })} />);

    // Denominations read as a plural, not as "Activo".
    expect(within(moduleRow("Denominaciones de caja")).getByText("Activas")).toBeInTheDocument();
  });

  it("marks the modules the tenant actually bought", () => {
    renderWithProviders(
      <TenantInfoCard tenant={tenantDetail({ fiscalModuleEnabled: true, rentalModuleEnabled: true })} />
    );

    expect(within(moduleRow("Modulo fiscal")).getByText("Activo")).toBeInTheDocument();
    expect(within(moduleRow("Alquileres")).getByText("Activo")).toBeInTheDocument();
    expect(within(moduleRow("Multicaja")).getByText("Inactivo")).toBeInTheDocument();
  });
});
