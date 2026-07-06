"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Wallet,
  ShoppingCart,
  Users,
  ReceiptText,
  History,
  Settings,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import type { PermissionCode } from "@/types/auth";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: PermissionCode;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports/sales", label: "Reportes", icon: BarChart3, permission: "REPORTS_VIEW" },
  { href: "/reports/accounts-receivable", label: "Cuentas por cobrar", icon: Wallet, permission: "REPORTS_VIEW" },
  { href: "/settings", label: "Configuracion", icon: Settings, permission: "SETTINGS_MANAGE" },
  { href: "/products", label: "Productos", icon: Package, permission: "INVENTORY_VIEW" },
  { href: "/inventory", label: "Inventario", icon: Boxes, permission: "INVENTORY_VIEW" },
  { href: "/cash-shift", label: "Turno de Caja", icon: Wallet, permission: "CASHSHIFT_OPEN" },
  { href: "/cash-shift/history", label: "Historial Caja", icon: History, permission: "CASHSHIFT_VIEW_HISTORY" },
  { href: "/pos", label: "POS", icon: ShoppingCart, permission: "SALE_CREATE" },
  { href: "/sales", label: "Ventas", icon: ReceiptText, permission: "SALE_CREATE" },
  { href: "/customers", label: "Clientes", icon: Users, permission: "CUSTOMER_EDIT" },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent",
        active && "bg-sidebar-accent text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function GatedNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const allowed = usePermission(item.permission!);
  if (!allowed) return null;
  return <NavLink item={item} active={active} />;
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
      <nav className="flex flex-col gap-1 p-4">
        {NAV_ITEMS.map((item) =>
          item.permission ? (
            <GatedNavLink key={item.href} item={item} active={pathname === item.href} />
          ) : (
            <NavLink key={item.href} item={item} active={pathname === item.href} />
          )
        )}
      </nav>
    </aside>
  );
}
