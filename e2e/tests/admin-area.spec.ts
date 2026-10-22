import { randomUUID } from "node:crypto";
import { signIn } from "../fixtures/journeys.js";
import { expect, test } from "../fixtures/test.js";

test("an admin signs in, opens every admin page and signs out", async ({ page, stack }) => {
  await page.goto("/it/login");
  await page.getByLabel("Email", { exact: true }).fill(stack.admin.email);
  await page.getByLabel("Password", { exact: true }).fill(randomUUID());
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(
    page.getByText("Email o password non corrette. Controllale e riprova.", { exact: true }),
  ).toBeVisible();
  await signIn(page, stack.admin.email, stack.admin.password);
  await expect(page.getByRole("heading", { name: "Ciao, Test." })).toBeVisible();
  for (const [link, heading] of [
    ["Gestione ordini", "Gestione ordini"],
    ["Catalogo prodotti", "Catalogo prodotti"],
    ["Utenti", "Utenti"],
  ] as const) {
    await page
      .getByRole("navigation", { name: "Area account", exact: true })
      .getByRole("link", { name: link, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Utenti");
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page).toHaveURL(/\/it\/login$/);
  await page.goto("/it/admin/orders");
  await expect(page).toHaveURL(/\/it\/login$/);
});

test("an admin manages the shop without a cart and is sent away from shopping pages", async ({
  page,
  stack,
}) => {
  await signIn(page, stack.admin.email, stack.admin.password);
  const navigation = page.getByRole("navigation", { name: "Area account", exact: true });
  for (const label of ["Profilo", "Gestione ordini", "Catalogo prodotti", "Utenti", "Esci"])
    await expect(navigation.getByText(label, { exact: true })).toBeVisible();
  await expect(navigation.getByText("Indirizzi", { exact: true })).toHaveCount(0);
  await expect(page.locator(".cart-count")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Carrello/ })).toHaveCount(0);
  await page.goto("/it/products/e2e-arrosticini");
  await expect(
    page.getByRole("heading", { name: "Arrosticini di prova", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Aggiungi", exact: true })).toHaveCount(0);
  for (const path of [
    "/it/cart",
    "/it/checkout",
    "/it/orders",
    "/it/account/addresses",
    "/it/account/payment-methods",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/it\/admin\/orders$/);
  }
});

test("customers cannot open the admin pages", async ({ page, stack }) => {
  const customer = await stack.createCustomer("Test", "Customer");
  await signIn(page, customer.email, customer.password);
  for (const path of ["/it/admin/orders", "/it/admin/users", "/it/admin/products"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(403);
  }
});

test("an admin filters the catalog by status, archives a product and restores it", async ({
  page,
  stack,
}) => {
  await signIn(page, stack.admin.email, stack.admin.password);
  await page.goto("/it/admin/products");
  await page.getByLabel("Stato", { exact: true }).selectOption("ACTIVE");
  await page.getByRole("button", { name: "Filtra prodotti", exact: true }).click();
  await expect(page).toHaveURL(/status=ACTIVE/);
  const row = page.getByRole("row").filter({ hasText: "Arrosticini di prova" });
  await expect(row).toContainText("Attivo");
  await row.getByRole("button", { name: "Archivia Arrosticini di prova", exact: true }).click();
  await expect(
    page.getByText("Arrosticini di prova è stato archiviato.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Annulla archiviazione", exact: true }).click();
  await expect(page.getByText("Il prodotto è stato ripristinato.", { exact: true })).toBeVisible();
  await page.goto("/it/admin/products?status=ARCHIVED");
  await expect(page.getByRole("row").filter({ hasText: "Arrosticini di prova" })).toHaveCount(0);
  await page.goto("/it/products?q=prova");
  await expect(page.getByRole("article").filter({ hasText: "Arrosticini di prova" })).toBeVisible();
});
