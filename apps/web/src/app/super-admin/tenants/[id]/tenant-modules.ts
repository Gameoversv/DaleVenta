import type { TenantDetailResponse } from "@/types/superadmin";

/** The optional modules a tenant can be sold, keyed by the flag that reports them. */
export type TenantModuleKey =
  | "fiscalModuleEnabled"
  | "cashDenominationsEnabled"
  | "multiBranchEnabled"
  | "multiRegisterEnabled"
  | "rentalModuleEnabled"
  | "purchaseModuleEnabled";

export interface TenantModule {
  key: TenantModuleKey;
  /** Last segment of the endpoint that flips it. */
  path: string;
  /** How the module is named in a list of what the tenant has. */
  label: string;
  /** How it is named where it is switched, which can be longer. */
  title: string;
  description: string;
  /** What the toast says once the switch has landed. */
  successMessage: string;
  /** Badge wording, which is not "Activo/Inactivo" for every module. */
  onLabel: string;
  offLabel: string;
}

/**
 * One description per module, used for both the summary badges and the switches.
 *
 * These six were six copies of the same mutation, the same card and the same badge, differing
 * only in the strings below. Describing them once means a seventh module is a row here rather
 * than another forty lines of the same thing.
 */
export const TENANT_MODULES: readonly TenantModule[] = [
  {
    key: "fiscalModuleEnabled",
    path: "fiscal-module",
    label: "Modulo fiscal",
    title: "Modulo fiscal / NCF",
    description: "Habilita RNC, comprobantes fiscales, secuencias NCF y factura fiscal para este tenant.",
    successMessage: "Modulo fiscal actualizado",
    onLabel: "Activo",
    offLabel: "Inactivo",
  },
  {
    key: "cashDenominationsEnabled",
    path: "cash-denominations",
    label: "Denominaciones de caja",
    title: "Denominaciones de caja",
    description:
      "Si esta activo, apertura, movimientos, ventas y cierre usan conteo por billetes/monedas. Si esta inactivo, caja trabaja con montos directos.",
    successMessage: "Denominaciones de caja actualizadas",
    onLabel: "Activas",
    offLabel: "Inactivas",
  },
  {
    key: "multiBranchEnabled",
    path: "multi-branch",
    label: "Multisucursal",
    title: "Multisucursal",
    description: "Permite crear y operar mas de una sucursal dentro del mismo tenant.",
    successMessage: "Modulo multisucursal actualizado",
    onLabel: "Activo",
    offLabel: "Inactivo",
  },
  {
    key: "multiRegisterEnabled",
    path: "multi-register",
    label: "Multicaja",
    title: "Multicaja",
    description: "Permite crear y operar mas de una caja por sucursal.",
    successMessage: "Modulo multicaja actualizado",
    onLabel: "Activo",
    offLabel: "Inactivo",
  },
  {
    key: "rentalModuleEnabled",
    path: "rental-module",
    label: "Alquileres",
    title: "Alquileres",
    description: "Habilita reservas, entregas, devoluciones, depositos y reportes de renta para este tenant.",
    successMessage: "Modulo de alquileres actualizado",
    onLabel: "Activo",
    offLabel: "Inactivo",
  },
  {
    key: "purchaseModuleEnabled",
    path: "purchase-module",
    label: "Compras y proveedores",
    title: "Compras y proveedores",
    description: "Habilita proveedores, ordenes de compra y recepcion de inventario para este tenant.",
    successMessage: "Modulo de compras actualizado",
    onLabel: "Activo",
    offLabel: "Inactivo",
  },
];

export function isModuleEnabled(tenant: TenantDetailResponse, module: TenantModule): boolean {
  return tenant[module.key];
}
