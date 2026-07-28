import { test, expect } from "@playwright/test";

test("crear categoria, crear producto, editar producto", async ({ page }) => {
  const uniqueEmail = `e2e-products-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill("Reposteria Products E2E");
  await page.getByLabel("Tu nombre").fill("Admin Products");
  await page.getByLabel("Correo").fill(uniqueEmail);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Productos" }).first().click();
  await expect(page).toHaveURL(/\/products/);

  await page.getByPlaceholder("Nueva categoria").fill("Bizcochos");
  await page.getByRole("button", { name: "+" }).click();
  await expect(page.getByText("Bizcochos")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo producto" }).click();
  await page.getByLabel("Categoria").selectOption({ label: "Bizcochos" });
  await page.getByLabel("Codigo interno").fill("BIZ-001");
  await page.getByLabel("Descripcion").fill("Bizcocho de chocolate");
  await page.getByLabel("Unidad").selectOption("unit");
  await page.getByLabel("Costo").fill("100.00");
  await page.getByLabel("Precio venta").fill("250.00");
  await page.getByLabel("Precio mayorista").fill("200.00");
  await page.getByLabel("Tasa de impuesto (%)").fill("0");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Bizcocho de chocolate")).toBeVisible();

  await page.getByRole("button", { name: "Editar Bizcocho de chocolate" }).click();
  await page.getByLabel("Descripcion").fill("Bizcocho de chocolate premium");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Bizcocho de chocolate premium")).toBeVisible();
});
