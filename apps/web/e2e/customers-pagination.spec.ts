import { test, expect, type Page } from "@playwright/test";
import { registerTenant } from "./support/tenant";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const PAGE_SIZE = 20;

/**
 * Crea clientes por API. Hacerlo por la UI cuesta un dialogo por cliente y lo
 * que se prueba aqui es la navegacion, no el formulario.
 */
async function seedCustomers(page: Page, count: number) {
  const token = await page.evaluate(() => localStorage.getItem("token"));
  expect(token).toBeTruthy();

  for (let i = 0; i < count; i++) {
    const orden = String(i).padStart(2, "0");
    const res = await page.request.post(`${API}/api/customers`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        firstName: `Cliente${orden}`,
        lastName: `Apellido${orden}`,
        // Telefono unico y buscable: valida que la busqueda paginada
        // mire el telefono, no solo nombre y cedula.
        phone: `809555${orden.padStart(4, "0")}`,
      },
    });
    expect(res.status()).toBe(201);
  }
}

test("la lista de clientes pagina y busca por telefono", async ({ page }) => {
  await registerTenant(page, "customers-pagination");

  const total = 25;
  await seedCustomers(page, total);

  await page.getByRole("link", { name: "Clientes" }).first().click();
  await expect(page).toHaveURL(/\/customers/);

  // Primera pagina: 20 de 25, sin poder retroceder.
  await expect(page.getByText(`Mostrando 1-${PAGE_SIZE} de ${total} clientes`)).toBeVisible();
  await expect(page.getByText("Pagina 1 de 2")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(PAGE_SIZE);
  await expect(page.getByRole("button", { name: "Anterior" })).toBeDisabled();

  // Segunda pagina: el resto. Antes del arreglo este boton no existia y los
  // clientes fuera del primer corte eran inalcanzables.
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText(`Mostrando 21-${total} de ${total} clientes`)).toBeVisible();
  await expect(page.getByText("Pagina 2 de 2")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(total - PAGE_SIZE);
  await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  await expect(page.getByText("Cliente24 Apellido24")).toBeVisible();

  await page.getByRole("button", { name: "Anterior" }).click();
  await expect(page.getByText("Pagina 1 de 2")).toBeVisible();

  // Buscar por telefono a un cliente que vive en la segunda pagina.
  await page.getByPlaceholder("Buscar por nombre, telefono o cedula...").fill("8095550024");
  await expect(page.getByText("Mostrando 1-1 de 1 clientes")).toBeVisible();
  await expect(page.getByText("Cliente24 Apellido24")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);

  // Una busqueda sin resultados no debe decir "aun no hay clientes".
  await page.getByPlaceholder("Buscar por nombre, telefono o cedula...").fill("zzzz-no-existe");
  await expect(page.getByText('Ningun cliente coincide con "zzzz-no-existe".')).toBeVisible();
});
