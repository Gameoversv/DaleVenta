import { money } from "@/lib/money";
import type { CreditTransactionResponse } from "@/types/credit";

/** Every charge and payment on the account, as the API ordered them. */
export function CreditHistorySection({
  transactions,
}: Readonly<{ transactions: CreditTransactionResponse[] | undefined }>) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Historial</h3>
      {transactions?.length === 0 && <p className="text-sm text-muted-foreground">Sin transacciones todavia.</p>}
      {transactions && transactions.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-1">Tipo</th>
              <th className="py-1">Monto</th>
              <th className="py-1">Pagado por</th>
              <th className="py-1">Nota</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => {
              const isCharge = transaction.type === "CHARGE";
              return (
                <tr key={transaction.id} className="border-b border-border">
                  <td className={`py-1 ${isCharge ? "text-destructive" : "text-success"}`}>
                    {isCharge ? "Cargo" : "Abono"}
                  </td>
                  <td className="py-1 font-mono-money">{money(transaction.amount)}</td>
                  <td className="py-1">{transaction.payerName ?? "—"}</td>
                  <td className="py-1">{transaction.note ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
