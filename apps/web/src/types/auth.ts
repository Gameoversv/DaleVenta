export type RoleName = "SUPER_ADMIN" | "ADMIN" | "CASHIER" | "CLIENT";

export type PermissionCode =
  | "INVENTORY_VIEW"
  | "INVENTORY_CREATE"
  | "INVENTORY_EDIT"
  | "INVENTORY_ADJUST"
  | "COST_VIEW"
  | "PRICE_VIEW"
  | "SALE_CREATE"
  | "SALE_DISCOUNT"
  | "SALE_PRICE_OVERRIDE"
  | "SALE_VOID"
  | "SALE_RETURN"
  | "CASHSHIFT_OPEN"
  | "CASHSHIFT_CLOSE"
  | "CASHSHIFT_VIEW_HISTORY"
  | "CUSTOMER_CREATE"
  | "CUSTOMER_EDIT"
  | "CREDIT_AUTHORIZE"
  | "CREDIT_RECEIVE_PAYMENT"
  | "REPORTS_VIEW"
  | "PROFIT_VIEW"
  | "USERS_MANAGE"
  | "SETTINGS_MANAGE";

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  active: boolean;
}

export interface MeResponse {
  user: UserResponse;
  permissions: PermissionCode[];
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}
