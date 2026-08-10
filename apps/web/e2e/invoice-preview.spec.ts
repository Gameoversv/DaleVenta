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

test("el ejemplo de factura refleja lo que hay en pantalla sin guardar", async ({ page }) => {
  await registerTenant(page, "invoice-preview");

  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
  await abrirSeccionFactura(page);

  await page.locator("#invoice-business-name").fill("Reposteria Dona Ana");
  await page.locator("#invoice-phone").fill("809-555-0100 / 829-555-0200");
  await page.locator("#invoice-footer").fill("Gracias por su compra");

  // Sin guardar: el preview debe leer el formulario en curso.
  await page.getByRole("button", { name: "Ver ejemplo" }).click();

  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText("Reposteria Dona Ana")).toBeVisible();
  await expect(dialogo.getByText("809-555-0100 / 829-555-0200")).toBeVisible();
  await expect(dialogo.getByText("Gracias por su compra")).toBeVisible();
  await expect(dialogo.getByText("EJEMPLO-0001")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialogo).toBeHidden();

  // Un interruptor apagado desaparece del ejemplo, tambien sin guardar.
  await page.getByRole("button", { name: "Ver ejemplo" }).click();
  await expect(page.getByRole("dialog").getByText("Impuesto")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByLabel("Mostrar impuesto").uncheck();
  await page.getByRole("button", { name: "Ver ejemplo" }).click();
  await expect(page.getByRole("dialog").getByText("Impuesto")).toBeHidden();
  await expect(page.getByRole("dialog").getByText("Subtotal")).toBeVisible();
});
