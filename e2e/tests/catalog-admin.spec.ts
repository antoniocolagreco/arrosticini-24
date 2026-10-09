import { randomUUID } from "node:crypto";
import type { Locator } from "@playwright/test";
import { expect, test } from "../fixtures/test.js";

test("an admin creates a draft, uploads an image and publishes it in both languages", async ({
  page,
  stack,
}) => {
  const slug: string = `e2e-product-${randomUUID()}`;
  await page.goto("/it/admin/products/new");
  await expect(page).toHaveURL(/\/it\/login$/);
  await page.getByLabel("Email", { exact: true }).fill(stack.admin.email);
  await page.getByLabel("Password", { exact: true }).fill(stack.admin.password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/it\/account$/);
  await page.goto("/it/admin/products/new");
  await page.locator("#nameIt").fill("Selezione di prova");
  await page.locator("#nameEn").fill("Test selection");
  await page.locator("#descriptionIt").fill("Prodotto creato dal percorso amministratore.");
  await page.locator("#descriptionEn").fill("Product created through the administrator journey.");
  await page.getByLabel("Indirizzo del prodotto", { exact: true }).fill(slug);
  await page.getByLabel("Prezzo in euro", { exact: true }).fill("42,50");
  await page.getByLabel("Pezzi per confezione (facoltativo)", { exact: true }).fill("90");
  await expect(page.getByLabel("Stato", { exact: true })).toHaveValue("DRAFT");
  await page.getByRole("button", { name: "Salva prodotto", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/it/admin/products/${slug}`));
  await expect(
    page.getByRole("status").filter({ hasText: "Il prodotto è stato creato." }),
  ).toBeVisible();
  const draft: Awaited<ReturnType<typeof page.request.get>> = await page.request.get(
    `/it/products/${slug}`,
  );
  expect(draft.status()).toBe(404);
  await page.getByLabel("Scegli un’immagine", { exact: true }).setInputFiles({
    name: "product.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfZkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Carica immagine", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "L’immagine è stata aggiunta." }),
  ).toBeVisible();
  const image: Locator = page.locator(".admin-image img");
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth === 1),
    )
    .toBe(true);
  expect(await image.evaluate((element) => getComputedStyle(element).objectFit)).toBe("contain");
  await page.getByLabel("Stato", { exact: true }).selectOption("ACTIVE");
  await page.getByRole("button", { name: "Salva prodotto", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Le modifiche sono state salvate." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Vedi nel negozio", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Selezione di prova", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Prodotto creato dal percorso amministratore.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cambia lingua", exact: true }).click();
  await page.getByRole("menuitem", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/en/products/${slug}$`));
  await expect(page.getByRole("heading", { name: "Test selection", exact: true })).toBeVisible();
  await expect(
    page.getByText("Product created through the administrator journey.", { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
