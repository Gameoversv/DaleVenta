import { test, expect } from "@playwright/test";

test("crear, editar caja, y desactivar sucursal", async ({ page }) => {
  const uniqueEmail = `e2e-branches-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill("Reposteria Branches E2E");
  await page.getByLabel("Tu nombre").fill("Admin Branches");
  await page.getByLabel("Correo").fill(uniqueEmail);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Sucursales" }).click();
  await expect(page).toHaveURL(/\/branches/);

  await page.getByRole("button", { name: "Nueva sucursal" }).click();
  await page.getByLabel("Nombre").fill("Sucursal Centro");
  await page.getByLabel("Direccion").fill("Calle Duarte 12");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Sucursal Centro")).toBeVisible();

  await page.getByRole("button", { name: "Editar sucursal" }).click();
  await page.getByLabel("Nombre").fill("Sucursal Centro Renombrada");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Sucursal Centro Renombrada")).toBeVisible();

  await page.getByText("Sucursal Centro Renombrada").click();
  await page.getByRole("button", { name: "Nueva caja" }).click();
  await page.getByLabel("Nombre").fill("Caja 1");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Caja 1")).toBeVisible();

  await page.getByRole("button", { name: "Editar Caja 1" }).click();
  await page.getByLabel("Nombre").fill("Caja Principal");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Caja Principal")).toBeVisible();

  await page.getByRole("button", { name: "Desactivar sucursal" }).click();
  await page.getByRole("button", { name: "Confirmar desactivacion" }).click();
  await expect(page.getByRole("heading", { name: "Desactivar Sucursal Centro Renombrada" })).not.toBeVisible();
  await expect(
    page.getByRole("button").filter({ hasText: "Sucursal Centro Renombrada" })
  ).not.toBeVisible();
});
