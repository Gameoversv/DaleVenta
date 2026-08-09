import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/test/render";
import { CreditHistorySection } from "./CreditHistorySection";
import type { CreditTransactionResponse } from "@/types/credit";

function transaction(overrides: Partial<CreditTransactionResponse> = {}): CreditTransactionResponse {
  return {
    id: "tx-1",
    type: "CHARGE",
    amount: "250.00",
    saleId: "s-1",
    note: null,
    payerName: null,
    ...overrides,
  };
}

describe("CreditHistorySection", () => {
  it("says nothing has happened on a brand new account", () => {
    renderWithProviders(<CreditHistorySection transactions={[]} />);

    expect(screen.getByText("Sin transacciones todavia.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("stays quiet rather than claiming an empty history while it loads", () => {
    renderWithProviders(<CreditHistorySection transactions={undefined} />);

    expect(screen.queryByText("Sin transacciones todavia.")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("names a charge and a payment apart", () => {
    renderWithProviders(
      <CreditHistorySection
        transactions={[transaction(), transaction({ id: "tx-2", type: "PAYMENT", amount: "100.00" })]}
      />
    );

    expect(screen.getByText("Cargo")).toBeInTheDocument();
    expect(screen.getByText("Abono")).toBeInTheDocument();
    expect(screen.getByText("RD$250.00")).toBeInTheDocument();
    expect(screen.getByText("RD$100.00")).toBeInTheDocument();
  });

  it("marks a charge against the account and a payment towards it in opposite tones", () => {
    renderWithProviders(
      <CreditHistorySection transactions={[transaction(), transaction({ id: "tx-2", type: "PAYMENT" })]} />
    );

    expect(screen.getByText("Cargo")).toHaveClass("text-destructive");
    expect(screen.getByText("Abono")).toHaveClass("text-success");
  });

  it("credits whoever actually paid, when it was not the customer", () => {
    renderWithProviders(
      <CreditHistorySection
        transactions={[transaction({ type: "PAYMENT", payerName: "Hermano", note: "Abono parcial" })]}
      />
    );

    expect(screen.getByText("Hermano")).toBeInTheDocument();
    expect(screen.getByText("Abono parcial")).toBeInTheDocument();
  });

  it("dashes out a payer and a note that were never recorded", () => {
    renderWithProviders(<CreditHistorySection transactions={[transaction()]} />);

    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});
