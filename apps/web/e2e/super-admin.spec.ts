import { test, expect } from "@playwright/test";
import { registerTenant } from "./support/tenant";
import { SUPER_ADMIN, loginAsSuperAdmin, logout, tenantRow } from "./support/super-admin";

/**
 * The super admin panel governs every other tenant — approving them, changing their plan and
 * switching their modules on — so the assertions that matter are the ones that check the effect
 * landed on the tenant, not just that a toast appeared.
 */

test("un admin de tenant no alcanza el panel de super admin", async ({ page }) => {
  await registerTenant(page, "sa-guard");

  await page.goto("/super-admin");
  // The layout bounces anyone whose role is not SUPER_ADMIN.
  await expect(page).not.toHaveURL(/\/super-admin/);
  await expect(page.getByRole("heading", { name: "Tenants" })).toHaveCount(0);
});

test("el resumen cuenta los tenants y lista el recien registrado", async ({ page }) => {
  const tenant = await registerTenant(page, "sa-overview");
  await logout(page);
  await loginAsSuperAdmin(page);

  await expect(page.getByText("Tenants totales")).toBeVisible();
  await expect(page.getByText("Usuarios totales")).toBeVisible();

  // A tenant was registered moments ago, so the counters cannot be at zero.
  const total = page.locator("p", { hasText: "Tenants totales" }).first().locator("xpath=following-sibling::p");
  await expect(total).not.toHaveText("0");

  await expect(page.getByRole("heading", { name: "Tenants recientes" })).toBeVisible();
  await expect(page.getByRole("link", { name: tenant.businessName })).toBeVisible();
});

test("aprobar un tenant pendiente lo pasa a trial y lo saca del filtro de pendientes", async ({ page }) => {
  const tenant = await registerTenant(page, "sa-approve");
  await logout(page);
  await loginAsSuperAdmin(page);

  await page.getByRole("link", { name: "Tenants" }).first().click();
  await expect(page.getByRole("heading", { name: "Tenants" })).toBeVisible();

  const row = tenantRow(page, tenant.businessName);
  await expect(row.getByText("Pendiente")).toBeVisible();

  await row.getByRole("button", { name: "Aprobar" }).click();
  await expect(row.getByText("Trial")).toBeVisible();
  // Approval is the only path out of PENDING, so the button has nothing left to do.
  await expect(row.getByRole("button", { name: "Aprobar" })).toHaveCount(0);

  await page.getByRole("button", { name: "Pendientes" }).click();
  await expect(tenantRow(page, tenant.businessName)).toHaveCount(0);

  await page.getByRole("button", { name: "Trial", exact: true }).click();
  await expect(tenantRow(page, tenant.businessName)).toHaveCount(1);
});

/**
 * The module switches are the panel's whole point: flipping one here has to change what the
 * tenant can actually reach. Fiscal starts off, and module-gates.spec.ts pins that a tenant with
 * it off cannot use the screen — this is the other half of that story.
 */
test("activar el modulo fiscal desde el panel se lo habilita al tenant", async ({ page }) => {
  const tenant = await registerTenant(page, "sa-fiscal");

  await page.goto("/fiscal");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Este modulo no esta activo para este tenant.")).toBeVisible();

  await logout(page);
  await loginAsSuperAdmin(page);
  await page.getByRole("link", { name: "Tenants" }).first().click();

  const row = tenantRow(page, tenant.businessName);
  await expect(row.getByText("Inactivo").first()).toBeVisible();
  await row.getByRole("button", { name: "Acciones" }).click();
  // Exact: "Activar modulo fiscal" is a substring of "Desactivar modulo fiscal".
  await page.getByRole("menuitem", { name: "Activar modulo fiscal", exact: true }).click();
  await expect(row.getByText("Activo").first()).toBeVisible();

  await logout(page);
  await page.goto("/login");
  await page.getByLabel("Correo").fill(tenant.email);
  await page.getByLabel("Contrasena").fill(tenant.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/fiscal");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Este modulo no esta activo para este tenant.")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Datos fiscales del negocio" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nueva secuencia" })).toBeVisible();
});

test("el detalle del tenant muestra su informacion y sus administradores", async ({ page }) => {
  const tenant = await registerTenant(page, "sa-detail");
  await logout(page);
  await loginAsSuperAdmin(page);

  await page.getByRole("link", { name: "Tenants" }).first().click();
  await page.getByRole("link", { name: tenant.businessName }).click();

  await expect(page.getByRole("heading", { name: "Informacion" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Estado y plan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Administradores" })).toBeVisible();
  // The account that registered the business is its administrator.
  await expect(page.getByText(tenant.email)).toBeVisible();
});

test("la busqueda de usuarios encuentra al admin y genera una contrasena temporal", async ({ page }) => {
  const tenant = await registerTenant(page, "sa-users");
  await logout(page);
  await loginAsSuperAdmin(page);

  await page.getByRole("link", { name: "Usuarios" }).first().click();
  await page.getByPlaceholder("Buscar por email...").fill(tenant.email);

  const row = page.locator("tr", { hasText: tenant.email });
  await expect(row).toHaveCount(1);
  await expect(row.getByText("Activo")).toBeVisible();

  await row.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByRole("heading", { name: "Resetear contrasena" })).toBeVisible();
  await page.getByRole("button", { name: "Generar" }).click();
  await expect(page.getByText("Contrasena temporal")).toBeVisible();
});

test("la auditoria del panel deja constancia de quien aprobo el tenant", async ({ page }) => {
  const tenant = await registerTenant(page, "sa-audit");
  await logout(page);
  await loginAsSuperAdmin(page);

  await page.getByRole("link", { name: "Tenants" }).first().click();
  await tenantRow(page, tenant.businessName).getByRole("button", { name: "Aprobar" }).click();
  await expect(tenantRow(page, tenant.businessName).getByText("Trial")).toBeVisible();

  await page.getByRole("link", { name: "Auditoria" }).first().click();
  const entry = page.locator("tr", { hasText: "APPROVE" }).first();
  await expect(entry).toBeVisible();
  await expect(entry.getByText(SUPER_ADMIN.email)).toBeVisible();
  await expect(entry.getByText("Aprobado")).toBeVisible();
});
