import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/test/render";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders the title as the page heading", () => {
    renderWithProviders(<PageHeader title="Inventario" />);

    expect(screen.getByRole("heading", { level: 1, name: "Inventario" })).toBeInTheDocument();
  });

  it("omits the description line when there is nothing to say", () => {
    const { container } = renderWithProviders(<PageHeader title="Inventario" />);

    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("renders the description under the title", () => {
    renderWithProviders(<PageHeader title="Auditoria" description="128 eventos registrados" />);

    expect(screen.getByText("128 eventos registrados")).toBeInTheDocument();
  });

  it("renders actions alongside the title", () => {
    renderWithProviders(<PageHeader title="Clientes" actions={<button type="button">Nuevo cliente</button>} />);

    expect(screen.getByRole("button", { name: "Nuevo cliente" })).toBeInTheDocument();
  });

  it("centers actions against the title by default", () => {
    const { container } = renderWithProviders(<PageHeader title="Clientes" actions={<span>accion</span>} />);

    expect(container.firstElementChild).toHaveClass("sm:items-center");
  });

  it("bottom-aligns actions when they are labelled form controls", () => {
    const { container } = renderWithProviders(
      <PageHeader title="Auditoria" align="end" actions={<span>filtro</span>} />
    );

    expect(container.firstElementChild).toHaveClass("sm:items-end");
  });

  it("keeps a single heading treatment so pages cannot drift apart", () => {
    renderWithProviders(<PageHeader title="Compras" />);

    // The three styles this replaced differed here; pinning it is the point of the component.
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass(
      "font-display",
      "text-2xl",
      "font-bold",
      "tracking-tight"
    );
  });
});
