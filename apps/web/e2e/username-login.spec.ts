import { test, expect } from "@playwright/test";
import { registerTenant } from "./support/tenant";

/**
 * El negocio crea a su gente con un usuario ("caja1") y esa persona entra
 * escribiendolo tal cual. El dueno, que se registro con un correo real, tiene
 * que poder seguir entrando con el.
 */
test("una cajera creada por usuario entra con ese usuario", async ({ page }) => {
  const { email: correoDueno, password } = await registerTenant(page, "username-login");
  // El username es unico en todo el sistema, asi que cada corrida necesita el
  // suyo: "caja1" se lo queda el primer negocio que lo pida.
  const usuario = `caja${Date.now()}`;

  await page.goto("/settings/users");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Nuevo usuario" }).click();
  await page.getByLabel("Nombre").fill("Rosa Cajera");
  await page.locator("#user-email").fill(usuario);
  await page.getByLabel("Contrasena inicial").fill("Secret123!");
  await page.getByLabel("Rol").selectOption("CASHIER");
  await page.getByRole("button", { name: "Guardar" }).click();

  // En la lista se ve el usuario, nunca el dominio reservado.
  await expect(page.getByText("Rosa Cajera")).toBeVisible();
  await expect(page.getByText(usuario, { exact: true })).toBeVisible();
  await expect(page.getByText(/daleventa\.invalid/)).toBeHidden();

  // La cajera entra con "caja1", sin arroba.
  await page.goto("/login");
  await page.locator("#email").fill(usuario);
  await page.locator("#password").fill("Secret123!");
  await page.getByRole("button", { name: /ingresar/i }).click();
  // Una cajera aterriza en el POS, no en el panel: su rol manda.
  await expect(page).toHaveURL(/\/pos/);

  // El dueno sigue entrando con su correo real: el cambio no lo dejo afuera.
  await page.goto("/login");
  await page.locator("#email").fill(correoDueno);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /ingresar/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
