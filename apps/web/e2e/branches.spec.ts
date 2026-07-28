import { test, expect } from "@playwright/test";
import { registerTenant } from "./support/tenant";

/**
 * A tenant is a single-location business by default: registration provisions "Sucursal principal"
 * and "Caja 1", and a second location means registering a separate tenant. This spec pins that
 * model — the branch is renamed, not created.
 */
test("la sucursal y caja provisionadas se renombran, y no se ofrece crear una segunda", async ({ page }) => {
  await registerTenant(page, "branches");

  await page.goto("/branches");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Sucursal principal")).toBeVisible();

  // Multi-branch is off and the tenant already has one, so creating another is not offered.
  await expect(page.getByRole("button", { name: "Nueva sucursal" })).toHaveCount(0);

  await page.getByRole("button", { name: "Editar sucursal" }).click();
  await page.getByLabel("Nombre").fill("Sucursal Centro");
  await page.getByLabel("Direccion").fill("Calle Duarte 12");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Sucursal Centro")).toBeVisible();

  await page.getByText("Sucursal Centro").click();
  await expect(page.getByText("Caja 1")).toBeVisible();

  await page.getByRole("button", { name: "Editar Caja 1" }).click();
  await page.getByLabel("Nombre").fill("Caja Principal");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Caja Principal")).toBeVisible();
});
