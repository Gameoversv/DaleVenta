import { test, expect } from "@playwright/test";

test("acceder a /dashboard sin sesion redirige a /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
