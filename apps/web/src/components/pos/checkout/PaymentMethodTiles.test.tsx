import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/test/render";
import { PaymentMethodTiles } from "./PaymentMethodTiles";

function setup(props: Partial<Parameters<typeof PaymentMethodTiles>[0]> = {}) {
  const onSelect = vi.fn();
  renderWithProviders(
    <PaymentMethodTiles
      method="CASH"
      canAuthorizeCredit
      hasCustomer
      onSelect={onSelect}
      {...props}
    />
  );
  return { onSelect };
}

const creditTile = () => screen.getByRole("button", { name: /credito/i });

describe("PaymentMethodTiles", () => {
  it("offers the four ways a sale can be paid", () => {
    setup();

    expect(screen.getAllByRole("button").map((tile) => tile.textContent)).toEqual([
      "Efectivo",
      "Transferencia",
      "Mixto",
      "Credito",
    ]);
  });

  it("reports the method the cashier picked", async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();

    await user.click(screen.getByRole("button", { name: /mixto/i }));

    expect(onSelect).toHaveBeenCalledWith("MIXED");
  });

  it("closes credit to a cashier who cannot authorise it, and says why", () => {
    setup({ canAuthorizeCredit: false });

    expect(creditTile()).toBeDisabled();
    expect(creditTile()).toHaveAttribute("title", "Tu usuario no tiene permiso para vender a credito");
  });

  it("closes credit on an anonymous sale, and says why", () => {
    setup({ hasCustomer: false });

    expect(creditTile()).toBeDisabled();
    expect(creditTile()).toHaveAttribute("title", "Selecciona un cliente para vender a credito");
  });

  it("blames the missing permission first when both are missing", () => {
    setup({ canAuthorizeCredit: false, hasCustomer: false });

    expect(creditTile()).toHaveAttribute("title", "Tu usuario no tiene permiso para vender a credito");
  });

  it("leaves an open tile without a tooltip", () => {
    setup();

    expect(creditTile()).toBeEnabled();
    expect(creditTile()).not.toHaveAttribute("title");
  });
});
