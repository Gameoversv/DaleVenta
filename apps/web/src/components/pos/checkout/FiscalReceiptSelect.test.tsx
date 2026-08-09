import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/test/render";
import { FiscalReceiptSelect } from "./FiscalReceiptSelect";
import type { FiscalReceiptSequence } from "@/types/fiscal";

function sequence(overrides: Partial<FiscalReceiptSequence> = {}): FiscalReceiptSequence {
  return {
    id: "seq-1",
    receiptType: "B01",
    nextNcf: "B0100000001",
    remaining: 50,
    active: true,
    ...overrides,
  } as FiscalReceiptSequence;
}

function optionLabels() {
  return screen.getAllByRole("option").map((option) => option.textContent);
}

describe("FiscalReceiptSelect", () => {
  it("offers a plain invoice plus every sequence that can still number one", () => {
    renderWithProviders(
      <FiscalReceiptSelect
        value=""
        onChange={vi.fn()}
        sequences={[sequence(), sequence({ id: "seq-2", receiptType: "B02", nextNcf: "B0200000007" })]}
      />
    );

    expect(optionLabels()).toEqual([
      "Factura normal",
      "B01 - proximo B0100000001",
      "B02 - proximo B0200000007",
    ]);
  });

  it("leaves out a sequence that has been turned off", () => {
    renderWithProviders(
      <FiscalReceiptSelect value="" onChange={vi.fn()} sequences={[sequence({ active: false })]} />
    );

    expect(optionLabels()).toEqual(["Factura normal"]);
    expect(screen.getByText(/no hay secuencias ncf activas/i)).toBeInTheDocument();
  });

  it("leaves out a sequence that has run out of numbers", () => {
    renderWithProviders(
      <FiscalReceiptSelect value="" onChange={vi.fn()} sequences={[sequence({ remaining: 0 })]} />
    );

    expect(optionLabels()).toEqual(["Factura normal"]);
    expect(screen.getByText(/no hay secuencias ncf activas/i)).toBeInTheDocument();
  });

  it("reports the chosen receipt type", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<FiscalReceiptSelect value="" onChange={onChange} sequences={[sequence()]} />);

    await user.selectOptions(screen.getByLabelText(/comprobante fiscal/i), "B01");

    expect(onChange).toHaveBeenCalledWith("B01");
  });

  it("reports the empty choice when the cashier falls back to a plain invoice", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<FiscalReceiptSelect value="B01" onChange={onChange} sequences={[sequence()]} />);

    await user.selectOptions(screen.getByLabelText(/comprobante fiscal/i), "");

    expect(onChange).toHaveBeenCalledWith("");
  });
});
