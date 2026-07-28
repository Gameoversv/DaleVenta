import { test, expect } from "@playwright/test";
import { registerTenant } from "./support/tenant";

async function createProduct(page: import("@playwright/test").Page) {
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
}

/**
 * A quotation prices goods without committing any of them, so the one thing that must hold is
 * that it never touches stock.
 */
test("cotizar dos unidades no mueve el inventario", async ({ page }) => {
  await registerTenant(page, "quotations");
  await createProduct(page);

  await page.getByRole("link", { name: "Inventario" }).first().click();
  await page.getByRole("button", { name: "Ajustar stock" }).click();
  await page.getByLabel("Producto").selectOption({ label: "Bizcocho de chocolate" });
  await page.getByLabel("Cantidad").fill("10");
  await page.getByLabel("Motivo").fill("Compra inicial");
  await page.getByRole("button", { name: "Guardar" }).click();
  const stockRow = page.locator("tr", { hasText: "Bizcocho de chocolate" });
  await expect(stockRow.locator("td").nth(1)).toHaveText("10");

  await page.getByRole("link", { name: "Cotizaciones" }).first().click();
  await expect(page).toHaveURL(/\/quotations/);

  await page.getByRole("button", { name: "Nueva cotizacion" }).click();
  await page.getByLabel("Producto").selectOption({ index: 1 });
  await page.getByLabel("Cantidad").fill("2");
  await page.getByRole("button", { name: "Agregar" }).click();
  await page.getByRole("button", { name: "Guardar cotizacion" }).click();

  // 2 x 250.00, numbered from the tenant's own sequence.
  await expect(page.getByText("CT-000001")).toBeVisible();
  await expect(page.getByText("RD$500.00").first()).toBeVisible();

  await page.getByRole("link", { name: "Inventario" }).first().click();
  const afterRow = page.locator("tr", { hasText: "Bizcocho de chocolate" });
  await expect(afterRow.locator("td").nth(1)).toHaveText("10");
});

test("un descuento mayor que el total es rechazado", async ({ page }) => {
  await registerTenant(page, "quotations-discount");
  await createProduct(page);

  await page.getByRole("link", { name: "Cotizaciones" }).first().click();
  await page.getByRole("button", { name: "Nueva cotizacion" }).click();
  await page.getByLabel("Producto").selectOption({ index: 1 });
  await page.getByLabel("Cantidad").fill("1");
  await page.getByRole("button", { name: "Agregar" }).click();

  // 250.00 of goods against a 9,999.00 discount would leave the tenant owing the customer.
  await page.getByLabel("Descuento").fill("9999");
  await page.getByRole("button", { name: "Guardar cotizacion" }).click();

  await expect(page.getByText("CT-000001")).toHaveCount(0);
});
