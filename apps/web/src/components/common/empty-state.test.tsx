import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/test/render";
import { EmptyState, ErrorState } from "./empty-state";

describe("EmptyState", () => {
  it("renders the message", () => {
    renderWithProviders(<EmptyState message="No hay sucursales todavia." />);

    expect(screen.getByText("No hay sucursales todavia.")).toBeInTheDocument();
  });

  it("renders the call to action when one is offered", () => {
    renderWithProviders(<EmptyState message="Aun no hay clientes." action={<button type="button">Crear</button>} />);

    expect(screen.getByRole("button", { name: "Crear" })).toBeInTheDocument();
  });

  it("takes padding from the caller, since it lands both loose and inside a card", () => {
    const { container } = renderWithProviders(<EmptyState message="Sin datos" className="p-6" />);

    expect(container.firstElementChild).toHaveClass("p-6");
  });

  it("is not announced as an alert, because empty is not a failure", () => {
    renderWithProviders(<EmptyState message="Sin datos" />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("announces the failure to assistive technology", () => {
    renderWithProviders(<ErrorState message="No se pudo cargar la lista." />);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar la lista.");
  });

  it("reads as a failure rather than as an empty result", () => {
    const { container } = renderWithProviders(<ErrorState message="Fallo la carga" />);

    expect(container.firstElementChild).toHaveClass("text-destructive");
  });

  it("renders a retry control when one is offered", () => {
    renderWithProviders(<ErrorState message="Fallo la carga" action={<button type="button">Reintentar</button>} />);

    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
