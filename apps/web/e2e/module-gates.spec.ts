import { test, expect } from "@playwright/test";
import { registerTenant } from "./support/tenant";

/**
 * Optional modules are off for a new tenant, and only a super admin turns them on. The navigation
 * hides them, but hiding a link is not access control — reaching the route directly must not work
 * either, which is what these assertions cover.
 */
test.describe("un tenant sin modulos opcionales", () => {
  test.beforeEach(async ({ page }) => {
    await registerTenant(page, "gates");
  });

  test("no ve las entradas de compras, alquileres ni fiscal en la navegacion", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Compras" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Alquileres" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Cuentas por pagar" })).toHaveCount(0);

    // Fiscal is admin-only rather than module-gated, so an admin does see the entry.
    await expect(page.getByRole("link", { name: "Fiscal" }).first()).toBeVisible();
  });

  test("no alcanza compras escribiendo la ruta", async ({ page }) => {
    await page.goto("/purchases");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Este modulo no esta activo para este tenant.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Nueva compra" })).toHaveCount(0);
  });

  test("no alcanza el modulo fiscal escribiendo la ruta", async ({ page }) => {
    await page.goto("/fiscal");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Este modulo no esta activo para este tenant.")).toBeVisible();
    // No NCF range can be created while the module is off. The button reads "Nueva secuencia" —
    // this used to look for "Nueva secuencia NCF", which is the dialog's title, so it counted zero
    // whether the module was on or off and proved nothing.
    await expect(page.getByRole("button", { name: "Nueva secuencia" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Datos fiscales del negocio" })).toHaveCount(0);
  });

  test("no ofrece nada en alquileres escribiendo la ruta", async ({ page }) => {
    await page.goto("/rentals");
    await page.waitForLoadState("networkidle");

    // This page renders nothing at all rather than an explanation, unlike purchases and fiscal.
    await expect(page.getByRole("button", { name: "Marcar como devuelto" })).toHaveCount(0);
    await expect(page.getByText("RT-")).toHaveCount(0);
  });

  test("el punto de venta no ofrece alquiler ni comprobante fiscal", async ({ page }) => {
    await page.goto("/pos");
    await page.waitForLoadState("networkidle");

    await expect(page.getByLabel("Devolucion")).toHaveCount(0);
    await expect(page.getByLabel("Comprobante fiscal")).toHaveCount(0);
  });
});
