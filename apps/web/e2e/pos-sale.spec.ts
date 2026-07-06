import { test, expect } from "@playwright/test";

test("vender en efectivo con cambio exacto y anular la venta revierte el stock", async ({ page }) => {
  const uniqueEmail = `e2e-possale-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill("Reposteria POS E2E");
  await page.getByLabel("Tu nombre").fill("Admin POS");
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

  await page.getByRole("link", { name: "Productos" }).click();
  await page.getByPlaceholder("Nueva categoria").fill("Bizcochos");
  await page.getByRole("button", { name: "+" }).click();
  await expect(page.getByText("Bizcochos")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo producto" }).click();
  await page.getByLabel("Categoria").selectOption({ label: "Bizcochos" });
  await page.getByLabel("Codigo interno").fill("BIZ-001");
  await page.getByLabel("Descripcion").fill("Bizcocho de chocolate");
  await page.getByLabel("Unidad").fill("unidad");
  await page.getByLabel("Costo").fill("100.00");
  await page.getByLabel("Precio venta").fill("250.00");
  await page.getByLabel("Precio mayorista").fill("200.00");
  await page.getByLabel("Tasa de impuesto (%)").fill("0");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Bizcocho de chocolate")).toBeVisible();

  await page.getByRole("link", { name: "Inventario" }).click();
  await page.locator("#branch-select").selectOption({ label: "Sucursal Centro" });
  await page.getByRole("button", { name: "Ajustar stock" }).click();
  await page.getByLabel("Producto").selectOption({ label: "Bizcocho de chocolate" });
  await page.getByLabel("Cantidad").fill("10");
  await page.getByLabel("Motivo").fill("Compra inicial");
  await page.getByRole("button", { name: "Guardar" }).click();
  const inventoryRow = page.locator("tr", { hasText: "Bizcocho de chocolate" });
  await expect(inventoryRow.locator("td").nth(1)).toHaveText("10");

  await page.getByRole("link", { name: "Turno de Caja" }).click();
  await page.locator("#cash-shift-branch").selectOption({ label: "Sucursal Centro" });
  await page.locator("#cash-shift-register").selectOption({ label: "Caja 1" });
  await expect(page.getByRole("heading", { name: "Abrir turno" })).toBeVisible();
  await page.getByLabel("RD$500").fill("2");
  await page.getByRole("button", { name: "Abrir turno" }).click();
  await expect(page.getByRole("heading", { name: "Turno abierto" })).toBeVisible();

  await page.getByRole("link", { name: "POS" }).click();
  await page.locator("#pos-branch").selectOption({ label: "Sucursal Centro" });
  await page.locator("#pos-register").selectOption({ label: "Caja 1" });

  await page.getByPlaceholder("Descripcion, codigo o codigo de barras").fill("Bizcocho");
  await page.getByRole("button", { name: /Bizcocho de chocolate/ }).click();
  await expect(page.getByText("RD$250.00").first()).toBeVisible();

  await page.getByLabel("RD$200", { exact: true }).fill("1");
  await page.getByLabel("RD$50", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Cobrar" }).click();

  await expect(page.getByRole("heading", { name: "Venta confirmada" })).toBeVisible();
  await expect(page.getByText("RD$250.00").first()).toBeVisible();

  await page.getByRole("button", { name: "Anular" }).click();
  await page.getByLabel("Motivo").fill("Cliente se arrepintio");
  await page.getByRole("button", { name: "Confirmar anulacion" }).click();
  await expect(page.getByRole("heading", { name: "Venta anulada" })).toBeVisible();

  await page.getByRole("link", { name: "Inventario" }).click();
  await page.locator("#branch-select").selectOption({ label: "Sucursal Centro" });
  const revertedRow = page.locator("tr", { hasText: "Bizcocho de chocolate" });
  await expect(revertedRow.locator("td").nth(1)).toHaveText("10");
});
