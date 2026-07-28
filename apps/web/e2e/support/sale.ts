import { expect, type Page } from "@playwright/test";

/**
 * Brings a fresh tenant to the point of having sold something: a product in the catalog, stock
 * on hand, and an open shift. Read-only screens have nothing to show until this has happened,
 * so asserting on them means producing the data first.
 */
export async function createProductWithStock(page: Page, units = 10) {
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
  await page.getByRole("button", { name: "Ajustar stock" }).click();
  await page.getByLabel("Producto").selectOption({ label: "Bizcocho de chocolate" });
  await page.getByLabel("Cantidad").fill(String(units));
  await page.getByLabel("Motivo").fill("Compra inicial");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(
    page.locator("tr", { hasText: "Bizcocho de chocolate" }).locator("td").nth(1)
  ).toHaveText(String(units));
}

/** Opens the shift with two 500 bills, so the drawer starts at RD$1,000.00. */
export async function openShift(page: Page) {
  await page.getByRole("link", { name: "Turno de Caja" }).first().click();
  await expect(page.getByRole("heading", { name: "Abrir turno" })).toBeVisible();
  await page.getByLabel("RD$500").fill("2");
  await page.getByRole("button", { name: "Abrir turno" }).click();
  await expect(page.getByRole("heading", { name: "Turno abierto" })).toBeVisible();
}

/** Sells one unit at 250.00, paid with a 200 bill and a 50 bill so no change is owed. */
export async function sellOneUnit(page: Page) {
  await page.getByRole("link", { name: "Punto de venta" }).first().click();
  await page.getByPlaceholder("Buscar producto por nombre, codigo o barcode...").fill("Bizcocho");
  await page.getByRole("button", { name: /Bizcocho de chocolate/ }).click();
  await expect(page.getByText("RD$250.00").first()).toBeVisible();

  await page.getByLabel("RD$200", { exact: true }).fill("1");
  await page.getByLabel("RD$50", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Cobrar" }).click();
  await expect(page.getByRole("heading", { name: "Venta confirmada" })).toBeVisible();
}
