export type TenantStatus = "PENDING" | "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
export type TenantPlan = "STARTER" | "PRO" | "ENTERPRISE";

export interface GlobalStatsResponse {
  tenantsTotal: number;
  tenantsPending: number;
  tenantsTrial: number;
  tenantsActive: number;
  tenantsSuspended: number;
  tenantsCancelled: number;
  usersTotal: number;
  customersTotal: number;
}

export interface ExpiringTenantResponse {
  id: string;
  name: string;
  slug: string;
  trialEndsAt: string | null;
}

export interface TenantSummaryResponse {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  fiscalModuleEnabled: boolean;
  cashDenominationsEnabled: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  userCount: number;
  customerCount: number;
}

export interface UserSummaryResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string | null;
  active: boolean;
  createdAt: string;
}

export interface TenantDetailResponse {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  rnc: string | null;
  plan: TenantPlan;
  status: TenantStatus;
  fiscalModuleEnabled: boolean;
  cashDenominationsEnabled: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  userCount: number;
  customerCount: number;
  owners: UserSummaryResponse[];
}

export interface ImpersonateResponse {
  token: string;
  tenantName: string;
}

export interface ResetPasswordResponse {
  temporaryPassword: string;
}

export interface AdminActionResponse {
  id: string;
  actorEmail: string;
  action: string;
  tenantId: string | null;
  detail: string | null;
  createdAt: string;
}
