import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "@/test/render";
import { CustomerPicker } from "./CustomerPicker";
import type { CustomerResponse } from "@/types/customer";

const get = vi.fn();
vi.mock("@/lib/api", () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

function customer(id: string, fullName: string): CustomerResponse {
  return { id, fullName, active: true } as CustomerResponse;
}

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({
    data: { data: [customer("cus-1", "Ana Perez"), customer("cus-2", "Ana Maria Gomez")] },
  });
});

describe("CustomerPicker", () => {
  it("explains that no selection means a walk-in sale", () => {
    renderWithProviders(<CustomerPicker customer={null} onChange={vi.fn()} />);

    expect(screen.getByText(/sin seleccion = cliente de contado/i)).toBeInTheDocument();
  });

  it("does not search until the cashier types something", () => {
    renderWithProviders(<CustomerPicker customer={null} onChange={vi.fn()} />);

    expect(get).not.toHaveBeenCalled();
  });

  it("lists the matches for what was typed", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CustomerPicker customer={null} onChange={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/buscar cliente/i), "ana");

    expect(await screen.findByRole("button", { name: "Ana Perez" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ana Maria Gomez" })).toBeInTheDocument();
  });

  it("hands the chosen customer to the sale", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<CustomerPicker customer={null} onChange={onChange} />);

    await user.type(screen.getByPlaceholderText(/buscar cliente/i), "ana");
    await user.click(await screen.findByRole("button", { name: "Ana Maria Gomez" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatchObject({ id: "cus-2" });
  });

  it("clears the search after choosing, so the next sale starts clean", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CustomerPicker customer={null} onChange={vi.fn()} />);

    const field = screen.getByPlaceholderText(/buscar cliente/i);
    await user.type(field, "ana");
    await user.click(await screen.findByRole("button", { name: "Ana Perez" }));

    await waitFor(() => expect(field).toHaveValue(""));
  });

  it("shows the selected customer instead of the search box", () => {
    renderWithProviders(<CustomerPicker customer={customer("cus-1", "Ana Perez")} onChange={vi.fn()} />);

    expect(screen.getByText("Ana Perez")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/buscar cliente/i)).not.toBeInTheDocument();
  });

  it("lets the cashier drop the customer and go back to a walk-in sale", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<CustomerPicker customer={customer("cus-1", "Ana Perez")} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /quitar/i }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("shows no result list when nothing matches", async () => {
    get.mockResolvedValue({ data: { data: [] } });
    const user = userEvent.setup();
    renderWithProviders(<CustomerPicker customer={null} onChange={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/buscar cliente/i), "zzz");

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
