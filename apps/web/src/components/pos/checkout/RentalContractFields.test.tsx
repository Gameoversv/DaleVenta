import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/test/render";
import { RentalContractFields } from "./RentalContractFields";

function setup(props: Partial<Parameters<typeof RentalContractFields>[0]> = {}) {
  const handlers = {
    onReturnAtChange: vi.fn(),
    onDepositChange: vi.fn(),
    onNotesChange: vi.fn(),
  };
  renderWithProviders(
    <RentalContractFields hasCustomer returnAt="" deposit="0" notes="" {...handlers} {...props} />
  );
  return handlers;
}

describe("RentalContractFields", () => {
  it("says a rental cannot be billed to nobody", () => {
    setup({ hasCustomer: false });

    expect(screen.getByText("Selecciona un cliente para facturar alquileres.")).toBeInTheDocument();
  });

  it("drops the warning once the sale has a customer", () => {
    setup();

    expect(screen.queryByText(/selecciona un cliente/i)).not.toBeInTheDocument();
    expect(screen.getByText("Contrato de alquiler")).toBeInTheDocument();
  });

  it("reports the contract terms as they are filled in", async () => {
    const user = userEvent.setup();
    const { onReturnAtChange, onDepositChange, onNotesChange } = setup({ deposit: "" });

    await user.type(screen.getByLabelText(/devolucion esperada/i), "2026-08-05T10:00");
    await user.type(screen.getByLabelText(/deposito/i), "3");
    await user.type(screen.getByLabelText(/notas/i), "A");

    expect(onReturnAtChange).toHaveBeenCalledWith("2026-08-05T10:00");
    expect(onDepositChange).toHaveBeenCalledWith("3");
    expect(onNotesChange).toHaveBeenCalledWith("A");
  });
});
