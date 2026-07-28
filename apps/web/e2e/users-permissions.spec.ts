import { test, expect } from "@playwright/test";
import { registerTenant } from "./support/tenant";

/**
 * User administration decides who can do what, so this walks the whole loop: create a cashier,
 * revoke a permission their role would otherwise grant, and confirm the override is what the
 * screen reports.
 */
test("crear un cajero, revocarle un permiso de su rol y reiniciar su clave", async ({ page }) => {
  await registerTenant(page, "users");

  await page.goto("/settings/users");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Usuarios internos" })).toBeVisible();

  const cashierEmail = `cajera-${Date.now()}@dalventa.test`;
  await page.getByRole("button", { name: "Nuevo usuario" }).click();
  await page.getByLabel("Nombre").fill("Maria Cajera");
  await page.getByLabel("Correo").fill(cashierEmail);
  await page.getByLabel("Contrasena inicial").fill("Secret123!");
  await page.getByLabel("Rol").selectOption("CASHIER");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText("Maria Cajera")).toBeVisible();
  await expect(page.getByText(cashierEmail)).toBeVisible();

  // A cashier holds SALE_CREATE through their role; revoking it must beat the role.
  await page.getByRole("button", { name: "Permisos" }).last().click();
  const createSalesRow = page.locator("tr", { hasText: "Crear ventas" });
  await expect(createSalesRow).toBeVisible();
  await createSalesRow.getByRole("combobox").selectOption("REVOKE");
  await expect(createSalesRow.getByRole("combobox")).toHaveValue("REVOKE");

  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Cambiar contrasena" }).last().click();
  await page.getByLabel("Nueva contrasena").fill("OtraClave123!");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByLabel("Nueva contrasena")).toHaveCount(0);
});

test("un cajero con un permiso revocado no ve la pantalla que ese permiso abre", async ({ page }) => {
  await registerTenant(page, "users-effect");

  const cashierEmail = `cajera-efecto-${Date.now()}@dalventa.test`;
  await page.goto("/settings/users");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Nuevo usuario" }).click();
  await page.getByLabel("Nombre").fill("Rosa Cajera");
  await page.getByLabel("Correo").fill(cashierEmail);
  await page.getByLabel("Contrasena inicial").fill("Secret123!");
  await page.getByLabel("Rol").selectOption("CASHIER");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Rosa Cajera")).toBeVisible();

  await page.getByRole("button", { name: "Permisos" }).last().click();
  const createSalesRow = page.locator("tr", { hasText: "Crear ventas" });
  await createSalesRow.getByRole("combobox").selectOption("REVOKE");
  await expect(createSalesRow.getByRole("combobox")).toHaveValue("REVOKE");
  await page.keyboard.press("Escape");

  // Sign in as the cashier and confirm the revoke reaches the navigation.
  await page.getByRole("button", { name: "Cerrar sesion" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Correo").fill(cashierEmail);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByRole("link", { name: "Punto de venta" })).toHaveCount(0);
});
