"use client";

import { LogOut, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/lib/auth-context";

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <MobileNav />
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        <span className="font-display text-sm font-bold">DaleVenta</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        {user && (
          <div className="mr-2 hidden text-right leading-tight sm:block">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
        )}
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Cerrar sesion">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
