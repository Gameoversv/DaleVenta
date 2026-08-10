import { test, expect } from "@playwright/test";
import { registerTenant } from "./support/tenant";

/** El formulario de factura vive en una seccion plegable. */
async function abrirSeccionFactura(page: import("@playwright/test").Page) {
  const campo = page.locator("#invoice-business-name");
  if (!(await campo.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Factura e impresion" }).click();
  }
  await expect(campo).toBeVisible();
}

/**
 * El API ya aceptaba rnc y showRnc, y la factura los imprimia, pero no habia
 * forma de escribirlos desde la aplicacion.
 */
test("el RNC se guarda, sobrevive a recargar y sale en la factura", async ({ page }) => {
  await registerTenant(page, "invoice-rnc");

  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
  await abrirSeccionFactura(page);

  await page.locator("#invoice-business-name").fill("Reposteria Dona Ana");
  await page.locator("#invoice-rnc").fill("131234567");
  await page.getByRole("button", { name: "Guardar factura" }).click();

  await page.reload();
  await page.waitForLoadState("networkidle");
  await abrirSeccionFactura(page);
  await expect(page.locator("#invoice-rnc")).toHaveValue("131234567");

  await page.getByRole("button", { name: "Ver ejemplo" }).click();
  await expect(page.getByRole("dialog").getByText("RNC: 131234567")).toBeVisible();
  await page.keyboard.press("Escape");

  // Apagar el interruptor lo saca de la factura sin borrar el dato.
  await page.getByLabel("Mostrar RNC").uncheck();
  await page.getByRole("button", { name: "Ver ejemplo" }).click();
  await expect(page.getByRole("dialog").getByText("RNC: 131234567")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator("#invoice-rnc")).toHaveValue("131234567");
});
