/**
 * Single source of truth for money formatting.
 *
 * Seventeen pages and components each carried their own formatter. Sixteen produced
 * "RD$1234.56" and the dashboard used Intl, producing "RD$1,234.56", so the same amount
 * rendered differently depending on the screen. They also disagreed on missing values:
 * some showed "-", some "RD$0.00", and a few would have printed "RD$NaN".
 *
 * Intl wins: on a point-of-sale screen a thousands separator is the difference between
 * reading RD$12,450.00 and RD$1245000 at a glance.
 */

const FORMATTER = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Placeholder for an amount that does not exist, as opposed to an amount that is zero. */
export const NO_AMOUNT = "-";

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/**
 * Formats an amount, falling back to {@link NO_AMOUNT} when there is nothing to show.
 * Use this when a blank value means "not applicable" — an unset price, an open balance.
 */
export function money(value: string | number | null | undefined): string {
  const amount = toNumber(value);
  return amount === null ? NO_AMOUNT : FORMATTER.format(amount);
}

/**
 * Formats an amount, treating a missing value as zero. Use this for running totals and
 * summaries, where "nothing recorded yet" genuinely means RD$0.00.
 */
export function moneyOrZero(value: string | number | null | undefined): string {
  return FORMATTER.format(toNumber(value) ?? 0);
}
