import type { FiscalProfile, FiscalReceiptType } from "@/types/fiscal";

/**
 * Fiscal profile and NCF sequence handling, pulled out of the fiscal page.
 *
 * NCF ranges are authorised by the tax authority, so the payload that creates or edits one is
 * worth pinning: a wrong bound silently narrows or widens what the register may issue.
 */

/**
 * Fills every field so the form is always controlled. A profile that has never been saved comes
 * back with nulls, which React would treat as an uncontrolled input and warn about mid-typing.
 */
export function normalizeFiscalProfile(raw: Partial<FiscalProfile> = {}): FiscalProfile {
  return {
    businessName: raw.businessName ?? "",
    tradeName: raw.tradeName ?? "",
    rnc: raw.rnc ?? "",
    fiscalAddress: raw.fiscalAddress ?? "",
    phone: raw.phone ?? "",
    email: raw.email ?? "",
    taxRegime: raw.taxRegime ?? "",
  };
}

export interface SequenceForm {
  receiptType: FiscalReceiptType;
  prefix: string;
  startNumber: string;
  nextNumber: string;
  endNumber: string;
  expiresAt: string;
  active: boolean;
}

export interface SequencePayload {
  receiptType: FiscalReceiptType;
  prefix: string;
  startNumber: number;
  nextNumber: number;
  endNumber: number;
  expiresAt: string;
  active: boolean;
}

/**
 * Turns the form strings into the numbers the API expects.
 * An empty prefix falls back to the receipt type, which is how the DGII numbers are written.
 */
export function sequencePayload(form: SequenceForm): SequencePayload {
  return {
    receiptType: form.receiptType,
    prefix: form.prefix.trim() || form.receiptType,
    startNumber: Number(form.startNumber),
    nextNumber: Number(form.nextNumber),
    endNumber: Number(form.endNumber),
    expiresAt: form.expiresAt,
    active: form.active,
  };
}

export function fiscalError(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}
