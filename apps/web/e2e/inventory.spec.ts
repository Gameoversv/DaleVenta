import { test, expect } from "@playwright/test";

test("seleccionar sucursal y ajustar stock", async ({ page }) => {
  const uniqueEmail = `e2e-inventory-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill("Reposteria Inventory E2E");
  await page.getByLabel("Tu nombre").fill("Admin Inventory");
  await page.getByLabel("Correo").fill(uniqueEmail);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // Registration already provisions "Sucursal principal" and "Caja 1"; a single-location
  // tenant has no branch or register picker, both are auto-selected.

  await page.getByRole("link", { name: "Productos" }).first().click();
  await page.getByPlaceholder("Nueva categoria").fill("Bizcochos");
  await page.getByRole("button", { name: "+" }).click();
  await expect(page.getByText("Bizcochos")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo producto" }).click();
  await page.getByLabel("Categoria").selectOption({ label: "Bizcochos" });
  await page.getByLabel("Codigo interno").fill("BIZ-001");
  await page.getByLabel("Descripcion").fill("Bizcocho de chocolate");
  await page.getByLabel("Unidad").selectOption("unit");
  await page.getByLabel("Costo").fill("100.00");
  await page.getByLabel("Precio venta").fill("250.00");
  await page.getByLabel("Precio mayorista").fill("200.00");
  await page.getByLabel("Tasa de impuesto (%)").fill("0");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Bizcocho de chocolate")).toBeVisible();

  await page.getByRole("link", { name: "Inventario" }).first().click();
  await expect(page).toHaveURL(/\/inventory/);
  await expect(page.getByText("no tiene productos con inventario registrado")).toBeVisible();

  await page.getByRole("button", { name: "Ajustar stock" }).click();
  await page.getByLabel("Producto").selectOption({ label: "Bizcocho de chocolate" });
  await page.getByLabel("Cantidad").fill("10");
  await page.getByLabel("Motivo").fill("Compra inicial");
  await page.getByRole("button", { name: "Guardar" }).click();

  const row = page.locator("tr", { hasText: "Bizcocho de chocolate" });
  await expect(row.locator("td").nth(1)).toHaveText("10");
});
