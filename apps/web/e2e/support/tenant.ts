import { expect, type Page } from "@playwright/test";

/**
 * Registers a brand-new tenant and lands on the dashboard, signed in as its admin.
 *
 * Every spec starts from its own tenant so they can run in any order without sharing state:
 * a product created by one spec must never make another spec's assertion pass.
 */
export async function registerTenant(page: Page, label: string) {
  const email = `e2e-${label}-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill(`Negocio ${label} E2E`);
  await page.getByLabel("Tu nombre").fill(`Admin ${label}`);
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  return { email, password: "Secret123!" };
}

/** Opens a screen from the sidebar and waits for the route to settle. */
export async function navigateTo(page: Page, linkName: string, urlPattern: RegExp) {
  await page.getByRole("link", { name: linkName }).click();
  await expect(page).toHaveURL(urlPattern);
}
