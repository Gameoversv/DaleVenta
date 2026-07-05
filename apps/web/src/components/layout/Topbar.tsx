"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <span className="font-semibold">DaleVenta</span>
      <div className="flex items-center gap-3">
        {user && <span className="text-sm text-muted-foreground">{user.name}</span>}
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Cerrar sesion">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
