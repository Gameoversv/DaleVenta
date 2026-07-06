import { test, expect } from "@playwright/test";

test("venta a credito aumenta balance, abono lo reduce, abono excesivo se rechaza", async ({ page }) => {
  const uniqueEmail = `e2e-credit-${Date.now()}@dalventa.test`;

  await page.goto("/register");
  await page.getByLabel("Nombre del negocio").fill("Reposteria Credit E2E");
  await page.getByLabel("Tu nombre").fill("Admin Credit");
  await page.getByLabel("Correo").fill(uniqueEmail);
  await page.getByLabel("Contrasena").fill("Secret123!");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Sucursales" }).click();
  await page.getByRole("button", { name: "Nueva sucursal" }).click();
  await page.getByLabel("Nombre").fill("Sucursal Centro");
  await page.getByLabel("Direccion").fill("Calle Duarte 12");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Sucursal Centro")).toBeVisible();

  await page.getByText("Sucursal Centro").click();
  await page.getByRole("button", { name: "Nueva caja" }).click();
  await page.getByLabel("Nombre").fill("Caja 1");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Caja 1")).toBeVisible();

  await page.getByRole("link", { name: "Productos" }).click();
  await page.getByPlaceholder("Nueva categoria").fill("Bizcochos");
  await page.getByRole("button", { name: "+" }).click();
  await expect(page.getByText("Bizcochos")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo producto" }).click();
  await page.getByLabel("Categoria").selectOption({ label: "Bizcochos" });
  await page.getByLabel("Codigo interno").fill("BIZ-001");
  await page.getByLabel("Descripcion").fill("Bizcocho de chocolate");
  await page.getByLabel("Unidad").fill("unidad");
  await page.getByLabel("Costo").fill("100.00");
  await page.getByLabel("Precio venta").fill("250.00");
  await page.getByLabel("Precio mayorista").fill("200.00");
  await page.getByLabel("Tasa de impuesto (%)").fill("0");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Bizcocho de chocolate")).toBeVisible();

  await page.getByRole("link", { name: "Inventario" }).click();
  await page.locator("#branch-select").selectOption({ label: "Sucursal Centro" });
  await page.getByRole("button", { name: "Ajustar stock" }).click();
  await page.getByLabel("Producto").selectOption({ label: "Bizcocho de chocolate" });
  await page.getByLabel("Cantidad").fill("10");
  await page.getByLabel("Motivo").fill("Compra inicial");
  await page.getByRole("button", { name: "Guardar" }).click();

  await page.getByRole("link", { name: "Clientes" }).click();
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  await page.getByLabel("Nombre").fill("Maria");
  await page.getByLabel("Apellido").fill("Gomez");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Maria Gomez")).toBeVisible();

  await page.getByRole("button", { name: "Credito" }).click();
  await page.getByLabel("Credito habilitado").check();
  await page.getByLabel("Limite de credito").fill("5000.00");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(page.getByText("Balance actual: RD$0.00")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Turno de Caja" }).click();
  await page.locator("#cash-shift-branch").selectOption({ label: "Sucursal Centro" });
  await page.locator("#cash-shift-register").selectOption({ label: "Caja 1" });
  await expect(page.getByRole("heading", { name: "Abrir turno" })).toBeVisible();
  await page.getByLabel("RD$500").fill("2");
  await page.getByRole("button", { name: "Abrir turno" }).click();
  await expect(page.getByRole("heading", { name: "Turno abierto" })).toBeVisible();

  await page.getByRole("link", { name: "POS" }).click();
  await page.locator("#pos-branch").selectOption({ label: "Sucursal Centro" });
  await page.locator("#pos-register").selectOption({ label: "Caja 1" });

  await page.getByPlaceholder("Buscar cliente (opcional)").fill("Maria");
  await page.getByRole("button", { name: "Maria Gomez" }).click();

  await page.getByPlaceholder("Descripcion, codigo o codigo de barras").fill("Bizcocho");
  await page.getByRole("button", { name: /Bizcocho de chocolate/ }).click();
  await expect(page.getByText("RD$250.00").first()).toBeVisible();

  await page.getByRole("button", { name: "Credito" }).click();
  await expect(page.getByText("Disponible: RD$5000.00")).toBeVisible();
  await page.getByRole("button", { name: "Cobrar" }).click();
  await expect(page.getByRole("heading", { name: "Venta confirmada" })).toBeVisible();

  await page.getByRole("link", { name: "Clientes" }).click();
  await page.getByRole("button", { name: "Credito" }).click();
  await expect(page.getByText("Balance actual: RD$250.00")).toBeVisible();

  await page.getByLabel("Monto").fill("100.00");
  await page.getByRole("button", { name: "Registrar abono" }).click();
  await expect(page.getByText("Balance actual: RD$150.00")).toBeVisible();

  await page.getByLabel("Monto").fill("999.00");
  await page.getByRole("button", { name: "Registrar abono" }).click();
  await expect(page.getByText("El abono no puede ser mayor al balance actual")).toBeVisible();
  await expect(page.getByText("Balance actual: RD$150.00")).toBeVisible();
});
