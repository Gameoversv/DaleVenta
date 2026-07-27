"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { visibleNavSections, type NavItem, type NavSection } from "@/components/layout/nav";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
        active && "bg-sidebar-accent text-sidebar-foreground"
      )}
    >
      {active && <span className="absolute left-0 top-1/2 h-4 -translate-y-1/2 w-0.5 rounded-full bg-sidebar-primary" />}
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/50")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavSectionBlock({ section, pathname }: { section: NavSection; pathname: string }) {
  return (
    <div className="space-y-1">
      <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
        {section.label}
      </p>
      {section.items.map((item) => (
        <NavLink key={item.href} item={item} active={pathname === item.href} />
      ))}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, permissions } = useAuth();
  const features = useTenantFeatures();
  const sections = visibleNavSections({ role: user?.role, permissions, features });

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/15">
          <Zap className="h-4 w-4 text-sidebar-primary" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-sm font-bold text-sidebar-foreground">DaleVenta</p>
        </div>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 pb-8">
        {sections.map((section) => (
          <NavSectionBlock key={section.label} section={section} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}
