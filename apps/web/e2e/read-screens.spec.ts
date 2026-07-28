import { test, expect, type Page } from "@playwright/test";
import { registerTenant } from "./support/tenant";
import { createProductWithStock, openShift, sellOneUnit } from "./support/sale";

/**
 * The read-only screens are the ones that report back what the business did, and they are the
 * easiest place for a broken contract to hide: nothing throws, the page just shows zeros. The
 * reports did exactly that — the API answered `gross_revenue` while the page read `grossRevenue`
 * — so these specs sell something real and then insist the number turns up on every screen.
 */

/** A metric card renders its label and value as sibling paragraphs. */
function metric(page: Page, label: string) {
  return page.locator("p", { hasText: label }).first().locator("xpath=following-sibling::p");
}

/** Counts the RD$1,250.00 the drawer should hold: two 500s, one 200 and one 50. */
async function closeShiftCountingExactChange(page: Page) {
  await page.getByRole("link", { name: "Turno de Caja" }).first().click();
  await page.getByRole("button", { name: "Cerrar turno" }).click();
  await expect(page.getByRole("heading", { name: "Cerrar turno" })).toBeVisible();
  await page.getByLabel("RD$500").fill("2");
  await page.getByLabel("RD$200", { exact: true }).fill("1");
  await page.getByLabel("RD$50", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Confirmar cierre" }).click();
  await expect(page.getByRole("heading", { name: "Turno cerrado" })).toBeVisible();
}

test.describe("las pantallas de lectura despues de una venta de RD$250.00", () => {
  test.beforeEach(async ({ page }) => {
    await registerTenant(page, "read");
    await createProductWithStock(page);
    await openShift(page);
    await sellOneUnit(page);
  });

  test("el historial de ventas lista la venta con su total y estado", async ({ page }) => {
    await page.getByRole("link", { name: "Ventas" }).first().click();
    await expect(page.getByRole("heading", { name: "Historial de ventas" })).toBeVisible();

    const row = page.locator("tr", { hasText: "RD$250.00" });
    await expect(row).toHaveCount(1);
    await expect(row.getByText("Completada")).toBeVisible();
    // A single-location tenant has nothing to pick between, so no selector is offered.
    await expect(page.getByLabel("Sucursal")).toHaveCount(0);

    await row.getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByRole("heading", { name: "Detalle de venta" })).toBeVisible();
    await expect(page.getByText("Bizcocho de chocolate")).toBeVisible();
  });

  /**
   * The log deliberately keeps only sensitive or irreversible actions: an ordinary completed sale
   * leaves no trace, and neither does a plain stock entry — voiding a sale and closing a shift do.
   * That gives the entity filter two different kinds of event to tell apart.
   */
  test("la auditoria registra la anulacion y el cierre de turno, y el filtro los separa", async ({ page }) => {
    await page.getByRole("link", { name: "Ventas" }).first().click();
    await page.locator("tr", { hasText: "RD$250.00" }).getByRole("button", { name: "Anular venta" }).click();
    await page.getByLabel("Motivo").fill("Cliente se arrepintio");
    await page.getByRole("button", { name: "Confirmar anulacion" }).click();
    await expect(page.getByText("Anulada")).toBeVisible();

    // The void put the RD$250 back, so the drawer is down to the two opening RD$500 bills.
    await page.getByRole("link", { name: "Turno de Caja" }).first().click();
    await page.getByRole("button", { name: "Cerrar turno" }).click();
    await expect(page.getByRole("heading", { name: "Cerrar turno" })).toBeVisible();
    await page.getByLabel("RD$500").fill("2");
    await page.getByRole("button", { name: "Confirmar cierre" }).click();
    await expect(page.getByRole("heading", { name: "Turno cerrado" })).toBeVisible();

    await page.getByRole("link", { name: "Auditoria" }).first().click();
    await expect(page.getByRole("heading", { name: "Eventos" })).toBeVisible();
    await expect(page.getByText("Venta anulada")).toBeVisible();
    await expect(page.getByText("Turno de caja cerrado")).toBeVisible();

    await page.getByLabel("Filtrar por").selectOption({ label: "Ventas" });
    await expect(page.getByText("Venta anulada")).toBeVisible();
    // The reason typed into the void dialog is what the log keeps as the detail.
    await expect(page.getByText("Cliente se arrepintio")).toBeVisible();
    await expect(page.getByText("Turno de caja cerrado")).toHaveCount(0);

    // A filter with no matching events says so rather than falling back to everything.
    await page.getByLabel("Filtrar por").selectOption({ label: "Cierres diarios" });
    await expect(page.getByText("No hay eventos para este filtro.")).toBeVisible();
  });

  test("el reporte de ventas muestra los importes reales, no ceros", async ({ page }) => {
    await page.getByRole("link", { name: "Reportes" }).first().click();

    await expect(metric(page, "Ingresos")).toHaveText("RD$250.00");
    await expect(metric(page, "Ventas completadas")).toHaveText("1");
    await expect(metric(page, "Ticket promedio")).toHaveText("RD$250.00");
    await expect(metric(page, "Anuladas")).toHaveText("0");

    await expect(page.getByRole("heading", { name: "Productos mas vendidos" })).toBeVisible();
    await expect(page.getByText("Bizcocho de chocolate")).toBeVisible();
  });

  test("el cierre diario refleja el efectivo solo cuando el turno ya cerro", async ({ page }) => {
    await page.getByRole("link", { name: "Cierre diario" }).first().click();

    // Revenue is read from the sales themselves, so it counts immediately.
    await expect(metric(page, "Ingresos")).toHaveText("RD$250.00");
    // The cash figures are columns the shift writes when it closes, so mid-shift they are still
    // zero even though RD$250 is already in the drawer. Deliberate, and worth pinning down.
    await expect(metric(page, "Efectivo esperado")).toHaveText("RD$0.00");
    await expect(page.getByRole("heading", { name: "Turnos incluidos" })).toBeVisible();

    await closeShiftCountingExactChange(page);

    await page.getByRole("link", { name: "Cierre diario" }).first().click();
    // Opened with two RD$500 bills and took in RD$250.
    await expect(metric(page, "Efectivo esperado")).toHaveText("RD$1,250.00");
    await expect(metric(page, "Efectivo contado")).toHaveText("RD$1,250.00");
    await expect(metric(page, "Diferencia")).toHaveText("RD$0.00");
  });

  test("el historial de caja muestra el turno cerrado y su detalle", async ({ page }) => {
    await closeShiftCountingExactChange(page);

    await page.getByRole("link", { name: "Historial de caja" }).first().click();
    await expect(page.getByRole("heading", { name: "Turnos registrados" })).toBeVisible();

    const row = page.locator("tbody tr").first();
    await expect(row.getByText("Cerrado")).toBeVisible();

    await row.getByRole("button", { name: "Ver detalle del turno" }).click();
    await expect(page.getByRole("heading", { name: "Detalle del turno" })).toBeVisible();
  });
});
