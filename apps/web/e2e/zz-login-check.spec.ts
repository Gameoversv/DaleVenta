import { test, expect } from "@playwright/test";

test("superadmin login via real browser", async ({ page }) => {
  page.on("console", (msg) => console.log("CONSOLE:", msg.text()));
  page.on("response", (res) => {
    if (res.url().includes("/api/auth/login")) {
      console.log("LOGIN RESPONSE STATUS:", res.status());
    }
  });
  await page.goto("/login");
  await page.getByLabel("Correo").fill("superadmin@dalventa.rd");
  await page.getByLabel("Contrasena").fill("superadmin123");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForTimeout(2000);
  console.log("URL AFTER SUBMIT:", page.url());
});
