"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Campo de contrasena con un boton de ver/ocultar propio y siempre presente.
 *
 * Edge dibuja su propio boton de revelar, pero solo mientras el campo tiene
 * foco y contenido, asi que aparece y desaparece solo. Chrome no lo dibuja.
 * Con este control el boton esta siempre, en cualquier navegador.
 */
const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);
  const label = visible ? "Ocultar contrasena" : "Mostrar contrasena";

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        // El boton nativo de Edge se apaga: si no, quedan dos ojitos.
        className={cn("pr-10 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={label}
        title={label}
        // tabIndex -1: al tabular desde la contrasena se sigue al campo
        // siguiente del formulario, no al ojito.
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
