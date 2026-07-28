/**
 * Single source of truth for date formatting.
 *
 * Fourteen pages and components each carried their own helper, all calling toLocaleString()
 * or toLocaleDateString() with no locale. That hands the format to whatever the browser is
 * set to, so the same invoice read 27/7/2026 for one cashier and 7/27/2026 for another —
 * ambiguous for every day of the month below 13. They also had no guard for an unparseable
 * value, which reached the screen as the literal text "Invalid Date".
 */

// Explicit parts rather than dateStyle: "short", which yields a two-digit year and a
// "p. m." suffix — too loose for something printed on an invoice.
const DATE_TIME = new Intl.DateTimeFormat("es-DO", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DATE_ONLY = new Intl.DateTimeFormat("es-DO", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

/** Placeholder for a timestamp that does not exist, such as a shift that is still open. */
export const NO_DATE = "-";

function parse(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date and time, e.g. "27/7/2026, 18:15". */
export function dateTime(value: string | number | Date | null | undefined): string {
  const date = parse(value);
  return date === null ? NO_DATE : DATE_TIME.format(date);
}

/** Date without the time, e.g. "27/7/2026". */
export function dateOnly(value: string | number | Date | null | undefined): string {
  const date = parse(value);
  return date === null ? NO_DATE : DATE_ONLY.format(date);
}
