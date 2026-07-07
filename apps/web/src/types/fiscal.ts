export type FiscalReceiptType = "B01" | "B02" | "B14" | "B15";

export interface FiscalProfile {
  businessName: string;
  tradeName: string | null;
  rnc: string;
  fiscalAddress: string | null;
  phone: string | null;
  email: string | null;
  taxRegime: string | null;
}

export interface FiscalReceiptSequence {
  id: string;
  receiptType: FiscalReceiptType;
  prefix: string;
  startNumber: number;
  nextNumber: number;
  endNumber: number;
  expiresAt: string;
  active: boolean;
  nextNcf: string;
  remaining: number;
}
