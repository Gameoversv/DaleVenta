import { test, expect } from "@playwright/test";
import { registerTenant } from "./support/tenant";


/** The invoice form lives in a collapsible section whose state is not the same on every load. */
async function openInvoiceSection(page: import("@playwright/test").Page) {
  const field = page.locator("#invoice-business-name");
  if (!(await field.isVisible())) {
    await page.getByRole("button", { name: "Factura e impresion" }).click();
  }
  await expect(field).toBeVisible();
}

/**
 * Invoice settings are what the customer ends up holding, so the values have to survive a reload
 * rather than only living in the form state.
 */
test("los datos de factura se guardan y sobreviven a recargar", async ({ page }) => {
  await registerTenant(page, "settings");

  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
  await openInvoiceSection(page);

  await page.locator("#invoice-business-name").fill("Reposteria Dona Ana");
  await page.locator("#invoice-phone").fill("8095550101");
  await page.locator("#invoice-address").fill("Calle Duarte 12");
  await page.locator("#invoice-city").fill("Santiago");
  await page.locator("#invoice-footer").fill("Gracias por su compra");
  await page.getByRole("button", { name: "Guardar factura" }).click();

  await page.reload();
  await page.waitForLoadState("networkidle");
  await openInvoiceSection(page);
  await expect(page.locator("#invoice-business-name")).toHaveValue("Reposteria Dona Ana");
  await expect(page.locator("#invoice-city")).toHaveValue("Santiago");
  await expect(page.locator("#invoice-footer")).toHaveValue("Gracias por su compra");
});

test("una denominacion nueva queda disponible para contar efectivo", async ({ page }) => {
  await registerTenant(page, "settings-denom");

  await page.goto("/settings");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Nueva denominacion" }).click();
  await page.getByLabel("Valor").fill("5000");
  await page.getByLabel("Tipo").selectOption("BILL");
  await page.getByRole("button", { name: "Guardar" }).click();

  // The cash-shift grid reads the same catalog, so the new denomination has to reach it.
  await page.goto("/cash-shift");
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("RD$5000")).toBeVisible();
});
