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
      { href: "/products", label: "Productos", icon: Package, permission: "INVENTORY_VIEW" },
      { href: "/inventory", label: "Inventario", icon: Boxes, permission: "INVENTORY_VIEW" },
      { href: "/cash-shift/history", label: "Historial de caja", icon: History, permission: "CASHSHIFT_VIEW_HISTORY" },
      { href: "/fiscal", label: "Fiscal", icon: Landmark, roles: ["ADMIN"] },
      { href: "/audit", label: "Auditoria", icon: ScrollText, permission: "AUDIT_VIEW" },
      { href: "/settings", label: "Configuracion", icon: Settings, permission: "SETTINGS_MANAGE" },
    ],
  },
];
