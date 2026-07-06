"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Building2, Users, ScrollText, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/super-admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/super-admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/super-admin/users", label: "Usuarios", icon: Users },
  { href: "/super-admin/audit", label: "Auditoria", icon: ScrollText },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hasToken = typeof window !== "undefined" && localStorage.getItem("token");
    if (!hasToken) {
      router.replace("/login");
      return;
    }
    if (!isLoading && (!user || user.role !== "SUPER_ADMIN")) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role !== "SUPER_ADMIN") {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <div className="p-4">
          <p className="text-sm font-semibold">DaleVenta</p>
          <p className="text-xs text-muted-foreground">Panel Super Admin</p>
        </div>
        <nav className="flex flex-col gap-1 p-4 pt-0">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
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
          })}
          <button
            onClick={logout}
            className="mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </button>
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">Conectado como {user.name}</p>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
