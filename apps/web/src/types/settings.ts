export type InvoicePrintSize = "LETTER" | "THERMAL_80MM" | "THERMAL_58MM";

export interface InvoiceSettingsResponse {
  businessName: string;
  rnc: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  logoUrl: string | null;
  footerMessage: string | null;
  printSize: InvoicePrintSize;
  showLogo: boolean;
  showRnc: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showAddress: boolean;
  showCustomer: boolean;
  showTax: boolean;
}
