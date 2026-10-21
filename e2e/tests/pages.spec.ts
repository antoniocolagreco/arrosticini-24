import { expect, test } from "../fixtures/test.js";

test("story, delivery and stress pages render in both languages", async ({ page }) => {
  for (const [path, heading] of [
    ["/it/story", "La nostra storia"],
    ["/en/story", "Our story"],
    ["/it/delivery", "Dall’Abruzzo al mondo"],
    ["/it/stress", "Pecore sotto pressione."],
  ] as const) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
});

test("unknown pages and unknown languages show the not-found page", async ({ page }) => {
  for (const path of ["/it/pagina-che-non-esiste", "/it/products/prodotto-inesistente", "/xx"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  }
  await page.goto("/it/pagina-che-non-esiste");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Questa pecora si è persa.");
  await page.getByRole("link", { name: "Torna alla home", exact: true }).click();
  await expect(page).toHaveURL(/\/it$/);
});
