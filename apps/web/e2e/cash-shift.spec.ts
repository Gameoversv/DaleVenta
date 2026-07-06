import { test, expect } from "@playwright/test";

test("abrir turno, registrar movimiento, cerrar turno sin diferencia", async ({ page }) => {
  const uniqueEmail = `e2e-cashshift-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill("Reposteria CashShift E2E");
  await page.getByLabel("Tu nombre").fill("Admin CashShift");
  await page.getByLabel("Correo").fill(uniqueEmail);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Sucursales" }).click();
  await page.getByRole("button", { name: "Nueva sucursal" }).click();
  await page.getByLabel("Nombre").fill("Sucursal Centro");
  await page.getByLabel("Direccion").fill("Calle Duarte 12");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Sucursal Centro")).toBeVisible();

  await page.getByText("Sucursal Centro").click();
  await page.getByRole("button", { name: "Nueva caja" }).click();
  await page.getByLabel("Nombre").fill("Caja 1");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Caja 1")).toBeVisible();

  await page.getByRole("link", { name: "Turno de Caja" }).click();
  await expect(page).toHaveURL(/\/cash-shift/);
  await page.getByLabel("Sucursal").selectOption({ label: "Sucursal Centro" });
  await page.getByLabel("Caja").selectOption({ label: "Caja 1" });

  await expect(page.getByRole("heading", { name: "Abrir turno" })).toBeVisible();
  await page.getByLabel("RD$500").fill("2");
  await page.getByRole("button", { name: "Abrir turno" }).click();
  await expect(page.getByRole("heading", { name: "Turno abierto" })).toBeVisible();
  await expect(page.getByText("RD$1000.00").first()).toBeVisible();

  await page.getByRole("button", { name: "Registrar movimiento" }).click();
  await page.getByLabel("Tipo").selectOption({ label: "Retiro" });
  await page.getByLabel("Motivo").fill("Deposito bancario");
  await page.getByLabel("RD$500").fill("1");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("RD$500.00").first()).toBeVisible();

  await page.getByRole("button", { name: "Cerrar turno" }).click();
  await expect(page.getByRole("heading", { name: "Cerrar turno" })).toBeVisible();
  await page.getByLabel("RD$500").fill("1");
  await page.getByRole("button", { name: "Confirmar cierre" }).click();
  await expect(page.getByRole("heading", { name: "Turno cerrado" })).toBeVisible();
  await expect(page.getByText("RD$0.00").first()).toBeVisible();
});
