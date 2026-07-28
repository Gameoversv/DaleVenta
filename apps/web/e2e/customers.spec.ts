import { test, expect } from "@playwright/test";

test("crear cliente, editar cliente, habilitar credito", async ({ page }) => {
  const uniqueEmail = `e2e-customers-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill("Reposteria Customers E2E");
  await page.getByLabel("Tu nombre").fill("Admin Customers");
  await page.getByLabel("Correo").fill(uniqueEmail);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Clientes" }).first().click();
  await expect(page).toHaveURL(/\/customers/);

  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  await page.getByLabel("Nombre").fill("Maria");
  await page.getByLabel("Apellido").fill("Gomez");
  await page.getByLabel("Telefono").fill("809-555-0100");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Maria Gomez")).toBeVisible();

  await page.getByRole("button", { name: "Editar Maria Gomez" }).click();
  await page.getByLabel("Telefono").fill("809-555-0200");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("809-555-0200")).toBeVisible();

  await page.getByRole("button", { name: "Credito" }).click();
  await page.getByLabel("Credito habilitado").check();
  await page.getByLabel("Limite de credito").fill("5000.00");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(page.getByText("Balance actual")).toBeVisible();
  await expect(page.getByText("RD$0.00").first()).toBeVisible();
});
