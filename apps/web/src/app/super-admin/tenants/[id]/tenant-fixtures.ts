import type { TenantDetailResponse } from "@/types/superadmin";

/** A tenant on a trial with nothing optional switched on. */
export function tenantDetail(overrides: Partial<TenantDetailResponse> = {}): TenantDetailResponse {
  return {
    id: "t-1",
    name: "Ferreteria Central",
    slug: "ferreteria-central",
    city: "Santiago",
    country: "DO",
    phone: "809-555-0100",
    email: "info@ferreteria.test",
    rnc: "131000000",
    plan: "STARTER",
    status: "TRIAL",
    fiscalModuleEnabled: false,
    cashDenominationsEnabled: false,
    multiBranchEnabled: false,
    multiRegisterEnabled: false,
    rentalModuleEnabled: false,
    purchaseModuleEnabled: false,
    trialEndsAt: "2026-09-01T00:00:00Z",
    createdAt: "2026-08-01T00:00:00Z",
    userCount: 3,
    customerCount: 42,
    owners: [],
    ...overrides,
  };
}
