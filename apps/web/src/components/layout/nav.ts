import {
  LayoutDashboard,
  Package,
  Boxes,
  Wallet,
  ShoppingCart,
  Users,
  ReceiptText,
  FileText,
  History,
  Settings,
  BarChart3,
  ClipboardCheck,
  ScrollText,
  Landmark,
  CalendarClock,
  Truck,
} from "lucide-react";
import type { PermissionCode, RoleName } from "@/types/auth";
import type { TenantFeatures } from "@/types/auth";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: PermissionCode;
  anyPermission?: PermissionCode[];
  feature?: keyof TenantFeatures;
  roles?: RoleName[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Operacion",
    items: [
      { href: "/pos", label: "Punto de venta", icon: ShoppingCart, permission: "SALE_CREATE" },
      { href: "/sales", label: "Ventas", icon: ReceiptText, anyPermission: ["SALE_VIEW_HISTORY", "SALE_CREATE"] },
      { href: "/quotations", label: "Cotizaciones", icon: FileText, anyPermission: ["SALE_VIEW_HISTORY", "SALE_CREATE"] },
      { href: "/cash-shift", label: "Turno de caja", icon: Wallet, permission: "CASHSHIFT_OPEN" },
      { href: "/customers", label: "Clientes", icon: Users, permission: "CUSTOMER_VIEW" },
      { href: "/rentals", label: "Alquileres", icon: CalendarClock, anyPermission: ["SALE_CREATE", "SALE_VIEW_HISTORY"], feature: "rentalModuleEnabled" },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "DASHBOARD_VIEW" },
      { href: "/reports/sales", label: "Reportes", icon: BarChart3, permission: "REPORTS_VIEW" },
      { href: "/reports/daily-close", label: "Cierre diario", icon: ClipboardCheck, permission: "REPORTS_VIEW" },
      { href: "/reports/accounts-receivable", label: "Cuentas por cobrar", icon: Wallet, permission: "REPORTS_VIEW" },
      { href: "/reports/accounts-payable", label: "Cuentas por pagar", icon: Wallet, anyPermission: ["PURCHASE_PAYABLE_VIEW", "PURCHASE_PAYMENT_RECORD"], feature: "purchaseModuleEnabled" },
      { href: "/products", label: "Productos", icon: Package, permission: "INVENTORY_VIEW" },
      { href: "/inventory", label: "Inventario", icon: Boxes, permission: "INVENTORY_VIEW" },
      { href: "/purchases", label: "Compras", icon: Truck, anyPermission: ["PURCHASE_VIEW", "SUPPLIER_VIEW"], feature: "purchaseModuleEnabled" },
      { href: "/cash-shift/history", label: "Historial de caja", icon: History, permission: "CASHSHIFT_VIEW_HISTORY" },
      { href: "/fiscal", label: "Fiscal", icon: Landmark, roles: ["ADMIN"] },
      { href: "/audit", label: "Auditoria", icon: ScrollText, permission: "AUDIT_VIEW" },
      { href: "/settings", label: "Configuracion", icon: Settings },
    ],
  },
];

/** Everything a nav item is evaluated against. Mirrors what `useAuth` exposes. */
export interface NavViewer {
  role: RoleName | undefined;
  permissions: PermissionCode[];
  features: TenantFeatures;
}

/**
 * Effective permission check, matching the backend resolution: ADMIN holds every permission,
 * anyone else needs it granted explicitly.
 */
function hasPermission(viewer: NavViewer, code: PermissionCode): boolean {
  return viewer.role === "ADMIN" || viewer.permissions.includes(code);
}

/**
 * Single source of truth for nav visibility, shared by the sidebar and the mobile menu.
 *
 * Keeping it a pure function means both surfaces cannot drift apart, and the rules can be tested
 * without rendering anything — the duplicated component-level gates previously also had to call
 * `usePermission` inside a loop.
 */
export function isNavItemVisible(item: NavItem, viewer: NavViewer): boolean {
  if (item.feature && !viewer.features[item.feature]) return false;
  if (item.roles && (!viewer.role || !item.roles.includes(viewer.role))) return false;
  if (item.permission && !hasPermission(viewer, item.permission)) return false;
  if (item.anyPermission && !item.anyPermission.some((code) => hasPermission(viewer, code))) return false;
  return true;
}

/** Sections with their items filtered; sections left with no visible item are dropped. */
export function visibleNavSections(viewer: NavViewer): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => isNavItemVisible(item, viewer)),
  })).filter((section) => section.items.length > 0);
}
