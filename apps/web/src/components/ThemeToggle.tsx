"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

const THEME_KEY = "theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_KEY, theme);
}

/**
 * The stored theme is browser state that React does not own, so it is read through
 * `useSyncExternalStore` rather than copied into state by a mount effect.
 *
 * The effect version had to set state during mount to get past hydration, which costs an extra
 * render and is exactly the cascading-render pattern the React Compiler lint rejects. The server
 * snapshot below keeps the markup deterministic instead.
 */
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  // Keeps a second tab in step; `storage` does not fire in the tab that made the change.
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function notify() {
  for (const listener of listeners) listener();
}

function getSnapshot(): Theme {
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

/** No storage on the server, and light is the documented default. */
function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    applyTheme(theme === "light" ? "dark" : "light");
    notify();
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Cambiar tema">
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}
