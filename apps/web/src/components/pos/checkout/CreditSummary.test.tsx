import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/test/render";
import { CreditSummary } from "./CreditSummary";
import type { CreditAccountResponse, CreditProfileResponse } from "@/types/credit";

const PROFILE = { creditEnabled: true, creditLimit: "1000.00" } as CreditProfileResponse;
const ACCOUNT = { balance: "200.00" } as CreditAccountResponse;

function setup(props: Partial<Parameters<typeof CreditSummary>[0]> = {}) {
  renderWithProviders(
    <CreditSummary
      canAuthorizeCredit
      hasCustomer
      creditProfile={PROFILE}
      creditAccount={ACCOUNT}
      creditEligible
      creditAvailable={800}
      withinLimit
      overLimitMessage="Excede el credito disponible."
      {...props}
    />
  );
}

describe("CreditSummary", () => {
  it("blames the permission when the cashier cannot authorise credit", () => {
    setup({ canAuthorizeCredit: false, creditEligible: false });

    expect(screen.getByText("Tu usuario no tiene permiso para vender a credito.")).toBeInTheDocument();
    expect(screen.queryByText(/disponible:/i)).not.toBeInTheDocument();
  });

  it("asks for a customer before it will talk about an account", () => {
    setup({ hasCustomer: false, creditEligible: false, creditProfile: undefined, creditAccount: undefined });

    expect(screen.getByText("Selecciona un cliente para vender a credito.")).toBeInTheDocument();
  });

  it("says when the customer simply has no credit", () => {
    setup({
      creditEligible: false,
      creditProfile: { creditEnabled: false, creditLimit: null } as CreditProfileResponse,
    });

    expect(screen.getByText("Este cliente no tiene credito habilitado.")).toBeInTheDocument();
  });

  it("shows the balance, the limit and what is left of it", () => {
    setup();

    expect(screen.getByText(/Balance actual: RD\$200\.00 · Limite: RD\$1000\.00/)).toBeInTheDocument();
    expect(screen.getByText("Disponible: RD$800.00")).toBeInTheDocument();
  });

  it("calls an unlimited profile unlimited rather than printing Infinity", () => {
    setup({
      creditProfile: { creditEnabled: true, creditLimit: null } as CreditProfileResponse,
      creditAvailable: Infinity,
    });

    expect(screen.getByText(/Limite: Sin limite/)).toBeInTheDocument();
    expect(screen.getByText("Disponible: Sin limite")).toBeInTheDocument();
  });

  it("refuses an amount past the headroom in the wording of the payment it belongs to", () => {
    setup({ withinLimit: false, overLimitMessage: "La parte a credito excede el disponible." });

    expect(screen.getByText("La parte a credito excede el disponible.")).toBeInTheDocument();
  });

  it("stays quiet about the limit while the account is still loading", () => {
    setup({ creditAccount: undefined, creditAvailable: null, withinLimit: false });

    expect(screen.queryByText(/disponible:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/excede/i)).not.toBeInTheDocument();
  });
});
