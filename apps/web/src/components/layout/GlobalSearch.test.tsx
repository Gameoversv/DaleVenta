import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { GlobalSearch } from "./GlobalSearch";
import type { GlobalSearchResult } from "@/types/search";

const get = vi.fn();
vi.mock("@/lib/api", () => ({ default: { get: (...args: unknown[]) => get(...args) } }));

// jsdom cannot follow a link, and its "navigation not implemented" error buries the real output.
// The anchor still carries its href, so what the tests read off it is unchanged.
vi.mock("next/link", () => ({
  default: ({ href, onClick, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

const RESULTS: GlobalSearchResult[] = [
  { type: "Factura", title: "F-000123", subtitle: "Ana Perez - RD$ 1,200.00", href: "/sales/s-1/invoice" },
  { type: "Cliente", title: "Ana Perez", subtitle: "809-555-0100", href: "/customers" },
  { type: "Producto", title: "Cemento gris", subtitle: "Existencia: 40 sacos", href: "/inventory" },
];

function answerWith(results: GlobalSearchResult[]) {
  get.mockImplementation((_url: string, config: { params: { q: string } }) =>
    Promise.resolve({ data: { data: { query: config.params.q, results } } })
  );
}

beforeEach(() => {
  get.mockReset();
  answerWith(RESULTS);
});

describe("GlobalSearch", () => {
  it("keeps quiet until the query is worth a round trip", async () => {
    renderWithProviders(<GlobalSearch />);

    await userEvent.type(screen.getByPlaceholderText(/buscar facturas/i), "a");

    expect(get).not.toHaveBeenCalled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("lists what the search returned, one link per hit", async () => {
    renderWithProviders(<GlobalSearch />);

    await userEvent.type(screen.getByPlaceholderText(/buscar facturas/i), "ana");

    expect(await screen.findByText("F-000123")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
        "/sales/s-1/invoice",
        "/customers",
        "/inventory",
      ])
    );
    expect(get).toHaveBeenCalledWith("/api/search", { params: { q: "ana" } });
  });

  it("says so when the search comes back empty", async () => {
    answerWith([]);
    renderWithProviders(<GlobalSearch />);

    await userEvent.type(screen.getByPlaceholderText(/buscar facturas/i), "zzz");

    expect(await screen.findByText(/no se encontraron resultados/i)).toBeInTheDocument();
  });

  it("closes the panel once a result is followed", async () => {
    renderWithProviders(<GlobalSearch />);
    await userEvent.type(screen.getByPlaceholderText(/buscar facturas/i), "ana");

    await userEvent.click(await screen.findByText("F-000123"));

    await waitFor(() => expect(screen.queryByText("F-000123")).not.toBeInTheDocument());
  });

  it("closes the panel on a click outside it", async () => {
    renderWithProviders(
      <div>
        <GlobalSearch />
        <button type="button">Fuera</button>
      </div>
    );
    await userEvent.type(screen.getByPlaceholderText(/buscar facturas/i), "ana");
    expect(await screen.findByText("F-000123")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Fuera" }));

    await waitFor(() => expect(screen.queryByText("F-000123")).not.toBeInTheDocument());
  });

  it("trims the query before searching so a stray space is not a new search", async () => {
    renderWithProviders(<GlobalSearch />);

    await userEvent.type(screen.getByPlaceholderText(/buscar facturas/i), "  ana  ");

    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/search", { params: { q: "ana" } }));
  });
});
