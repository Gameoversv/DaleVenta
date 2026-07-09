"use client";

import Link from "next/link";
import { Menu, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/hooks/usePermission";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { NAV_SECTIONS, type NavItem } from "@/components/layout/nav";

function NavMenuItem({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <DropdownMenuItem asChild>
      <Link href={item.href} className="gap-2.5">
        <Icon className="h-4 w-4" />
        {item.label}
      </Link>
    </DropdownMenuItem>
  );
}

function GatedNavMenuItem({ item }: { item: NavItem }) {
  const { user } = useAuth();
  const tenantFeatures = useTenantFeatures();
  const allowed = usePermission(item.permission!);
  if (
    !allowed ||
    (item.feature && !tenantFeatures[item.feature]) ||
    (item.roles && (!user || !item.roles.includes(user.role)))
  ) return null;
  return <NavMenuItem item={item} />;
}

function AnyGatedNavMenuItem({ item }: { item: NavItem }) {
  const { user } = useAuth();
  const tenantFeatures = useTenantFeatures();
  const permissions = item.anyPermission!;
  /* eslint-disable react-hooks/rules-of-hooks -- fixed-length array of PermissionCode, stable across renders */
  const allowedFlags = permissions.map((code) => usePermission(code));
  /* eslint-enable react-hooks/rules-of-hooks */
  if (
    !allowedFlags.some(Boolean) ||
    (item.feature && !tenantFeatures[item.feature]) ||
    (item.roles && (!user || !item.roles.includes(user.role)))
  ) return null;
  return <NavMenuItem item={item} />;
}

function FeatureGatedNavMenuItem({ item }: { item: NavItem }) {
  const { user } = useAuth();
  const tenantFeatures = useTenantFeatures();
  if (
    (item.feature && !tenantFeatures[item.feature]) ||
    (item.roles && (!user || !item.roles.includes(user.role)))
  ) return null;
  return <NavMenuItem item={item} />;
}

export function MobileNav() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Menu className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[80vh] w-64 overflow-y-auto">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-display text-sm font-bold">DaleVenta</span>
        </div>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {section.label}
            </DropdownMenuLabel>
            {section.items.map((item) => {
              if (item.anyPermission) {
                return <AnyGatedNavMenuItem key={item.href} item={item} />;
              }
              if (item.permission) {
                return <GatedNavMenuItem key={item.href} item={item} />;
              }
              if (item.feature) {
                return <FeatureGatedNavMenuItem key={item.href} item={item} />;
              }
              if (item.roles) {
                return <FeatureGatedNavMenuItem key={item.href} item={item} />;
              }
              return <NavMenuItem key={item.href} item={item} />;
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
