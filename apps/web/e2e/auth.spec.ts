import { test, expect } from "@playwright/test";

test("registro de tenant -> login automatico -> dashboard -> logout", async ({ page }) => {
  const uniqueEmail = `e2e-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill("Reposteria E2E");
  await page.getByLabel("Tu nombre").fill("Admin E2E");
  await page.getByLabel("Correo").fill(uniqueEmail);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Registrar" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Bienvenido, Admin E2E")).toBeVisible();

  await page.getByRole("button", { name: "Cerrar sesion" }).click();
  await expect(page).toHaveURL(/\/login/);
});
