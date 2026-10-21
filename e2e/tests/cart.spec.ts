import { expect, test } from "../fixtures/test.js";

test("the cart changes quantities, removes a product and restores it", async ({ page }) => {
  await page.goto("/it/products/e2e-arrosticini");
  await expect(
    page.getByRole("heading", { name: "Arrosticini di prova", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aggiungi", exact: true }).click();
  await expect(page.locator(".cart-count")).toHaveText("1");
  await page.goto("/it/cart");
  await page.getByRole("button", { name: "Aumenta", exact: true }).click();
  await page.getByRole("button", { name: "Aumenta", exact: true }).click();
  await expect(page.getByLabel("Quantità", { exact: true })).toHaveText("3");
  await page.getByRole("button", { name: "Diminuisci", exact: true }).click();
  await expect(page.getByLabel("Quantità", { exact: true })).toHaveText("2");
  await expect(page.locator(".cart-count")).toHaveText("2");
  await page.getByRole("button", { name: "Rimuovi Arrosticini di prova", exact: true }).click();
  await expect(page.getByText("Arrosticini di prova rimosso dal carrello.")).toBeVisible();
  await page.getByRole("button", { name: "Annulla", exact: true }).click();
  await expect(page.getByLabel("Quantità", { exact: true })).toHaveText("2");
  await page.getByRole("button", { name: "Rimuovi Arrosticini di prova", exact: true }).click();
  await expect(page.locator(".cart-count")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Il carrello è vuoto." })).toBeVisible();
});

test("search finds a product and explains when nothing matches", async ({ page }) => {
  await page.goto("/it/products");
  await page.getByLabel("Cerca nel catalogo", { exact: true }).fill("prova");
  await page.getByLabel("Cerca nel catalogo", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/it\/products\?q=prova$/);
  await page
    .getByRole("article")
    .filter({ hasText: "Arrosticini di prova" })
    .getByRole("link")
    .first()
    .click();
  await expect(page).toHaveURL(/\/it\/products\/e2e-arrosticini$/);
  await page.goto("/it/products?q=nessunprodottoesiste");
  await expect(
    page.getByRole("heading", { name: "Nessun prodotto per “nessunprodottoesiste”." }),
  ).toBeVisible();
});

test("the shop pages through more than twenty products", async ({ page, stack }) => {
  await stack.createProducts(
    Array.from({ length: 21 }, (_, index) => `zz-pager-${String(index + 1).padStart(2, "0")}`),
  );
  await page.goto("/it/products?q=zz-pager");
  await expect(page.getByRole("article")).toHaveCount(20);
  await page.getByRole("link", { name: "Pagina successiva", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article")).toContainText("Prodotto zz-pager-21");
  await page.getByRole("link", { name: "Prima pagina", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(20);
});
