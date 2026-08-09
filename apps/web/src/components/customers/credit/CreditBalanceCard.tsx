import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { money } from "@/lib/money";
import type { CreditAccountResponse, CreditProfileResponse } from "@/types/credit";

interface CreditBalanceCardProps {
  account: CreditAccountResponse | undefined;
  profile: CreditProfileResponse | undefined;
}

/**
 * What is left of the limit, or null when there is nothing to subtract from.
 *
 * An open credit line has no limit, so it has no "available" either: showing a number there would
 * imply a ceiling the customer does not have.
 */
function availableCredit(
  account: CreditAccountResponse | undefined,
  profile: CreditProfileResponse | undefined
): string | null {
  if (!account || profile?.creditLimit == null) return null;
  return (Number(profile.creditLimit) - Number(account.balance)).toFixed(2);
}

/** What the customer owes, and what they can still take. */
export function CreditBalanceCard({ account, profile }: Readonly<CreditBalanceCardProps>) {
  const available = availableCredit(account, profile);
  const owes = Number(account?.balance ?? 0) > 0;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Balance</h3>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Balance actual</p>
            <p className={`font-mono-money text-lg font-bold ${owes ? "text-warning" : "text-success"}`}>
              {money(account?.balance ?? "0.00")}
            </p>
          </div>
          {available !== null && (
            <div>
              <p className="text-xs text-muted-foreground">Disponible</p>
              <p className="font-mono-money text-lg font-semibold">{money(available)}</p>
            </div>
          )}
          {profile && (
            <Badge variant={profile.creditEnabled ? "success" : "secondary"} className="ml-auto">
              {profile.creditEnabled ? "Credito habilitado" : "Credito no habilitado"}
            </Badge>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
