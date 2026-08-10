import { test, expect } from "@playwright/test";
import { registerTenant } from "./support/tenant";

/**
 * El boton nativo de Edge solo aparece con foco y contenido, asi que el
 * cliente lo veia aparecer y desaparecer. Este spec fija el comportamiento
 * que reemplaza ese boton: el nuestro esta siempre, aun con el campo vacio.
 */
test("el ojito de la contrasena esta siempre visible al crear un usuario", async ({ page }) => {
  await registerTenant(page, "password-eye");

  await page.goto("/settings/users");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Nuevo usuario" }).click();

  const campo = page.locator("#user-password");
  const mostrar = page.getByRole("button", { name: "Mostrar contrasena" });

  // Sin foco y sin contenido: el nativo no estaria, el nuestro si.
  await expect(mostrar).toBeVisible();
  await expect(campo).toHaveAttribute("type", "password");

  await campo.fill("Secret123!");
  await expect(campo).toHaveAttribute("type", "password");

  await mostrar.click();
  await expect(campo).toHaveAttribute("type", "text");
  await expect(campo).toHaveValue("Secret123!");

  const ocultar = page.getByRole("button", { name: "Ocultar contrasena" });
  await expect(ocultar).toBeVisible();
  await ocultar.click();
  await expect(campo).toHaveAttribute("type", "password");

  // Alternar no puede enviar el formulario: el dialogo sigue abierto.
  await expect(page.getByRole("button", { name: "Guardar" })).toBeVisible();
});
