import type { CreditAccountResponse, CreditProfileResponse } from "@/types/credit";

interface CreditSummaryProps {
  canAuthorizeCredit: boolean;
  hasCustomer: boolean;
  creditProfile: CreditProfileResponse | undefined;
  creditAccount: CreditAccountResponse | undefined;
  /** Permission, customer and an enabled profile, all three. */
  creditEligible: boolean;
  /** Headroom left on the account, `Infinity` for an unlimited profile, null while unknown. */
  creditAvailable: number | null;
  /** Whether the amount going on credit fits in that headroom. */
  withinLimit: boolean;
  /** Said when it does not: a whole sale and the tail of a mixed one are refused differently. */
  overLimitMessage: string;
  className?: string;
}

/**
 * Why a credit sale is or is not allowed, and what is left on the account.
 *
 * Shared by the credit tab and the credit half of a mixed payment. Those two disagreed on the
 * wording for months, which is how a cashier could read "excede el disponible" on one tab and
 * nothing at all on the other for the very same account.
 */
export function CreditSummary({
  canAuthorizeCredit,
  hasCustomer,
  creditProfile,
  creditAccount,
  creditEligible,
  creditAvailable,
  withinLimit,
  overLimitMessage,
  className = "space-y-2",
}: Readonly<CreditSummaryProps>) {
  return (
    <div className={className}>
      {!canAuthorizeCredit && (
        <p className="text-sm text-destructive">Tu usuario no tiene permiso para vender a credito.</p>
      )}
      {canAuthorizeCredit && !hasCustomer && (
        <p className="text-sm text-destructive">Selecciona un cliente para vender a credito.</p>
      )}
      {hasCustomer && creditProfile && !creditProfile.creditEnabled && (
        <p className="text-sm text-destructive">Este cliente no tiene credito habilitado.</p>
      )}
      {hasCustomer && creditEligible && creditAccount && creditProfile && (
        <>
          <p className="text-sm">
            Balance actual: RD${creditAccount.balance} · Limite:{" "}
            {creditProfile.creditLimit == null ? "Sin limite" : `RD$${creditProfile.creditLimit}`}
          </p>
          <p className="text-sm font-medium">
            Disponible: {creditAvailable === Infinity ? "Sin limite" : `RD$${creditAvailable?.toFixed(2)}`}
          </p>
          {!withinLimit && <p className="text-sm text-destructive">{overLimitMessage}</p>}
        </>
      )}
    </div>
  );
}
