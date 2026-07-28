import { expect, type Page } from "@playwright/test";

/**
 * The super admin is not registered through the UI — it is seeded by the API on startup from
 * `app.seed.super-admin-*`. The e2e stack seeds a throwaway password, so nothing real is written
 * into the repository; override both values together when pointing the suite at another stack.
 */
export const SUPER_ADMIN = {
  email: process.env.E2E_SUPER_ADMIN_EMAIL ?? "superadmin@dalventa.rd",
  password: process.env.E2E_SUPER_ADMIN_PASSWORD ?? "E2eSuperAdmin123!",
};

export async function loginAsSuperAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(SUPER_ADMIN.email);
  await page.getByLabel("Contrasena").fill(SUPER_ADMIN.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/super-admin/);
}

/** Signs the current session out so the next login starts clean. */
export async function logout(page: Page) {
  await page.evaluate(() => window.localStorage.removeItem("token"));
}

/**
 * Finds a tenant's row on the tenants screen. Every earlier run left its own tenants behind, so
 * the list is paged and the name — stamped at registration — is the only reliable handle.
 */
export function tenantRow(page: Page, businessName: string) {
  return page.locator("tr", { hasText: businessName });
}
