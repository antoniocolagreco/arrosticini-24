import type { Page } from "@playwright/test";
import { expect } from "./test.js";

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/it/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/it\/account$/);
}

export async function addTestArrosticini(page: Page): Promise<void> {
  await page.goto("/it/products");
  await page
    .getByRole("article")
    .filter({ hasText: "Arrosticini di prova" })
    .getByRole("button", { name: "Aggiungi", exact: true })
    .click();
  await expect(page.locator(".cart-count")).toHaveText("1");
}

export async function fillAddress(page: Page, fullName: string, city: string): Promise<void> {
  await page.getByLabel("Nome e cognome del destinatario", { exact: true }).fill(fullName);
  await page.getByLabel("Telefono del destinatario", { exact: true }).fill("+390871000000");
  await page.getByLabel("Via e numero civico", { exact: true }).fill("Via Test 1");
  await page.getByLabel("Città", { exact: true }).fill(city);
  await page.getByLabel("Codice postale", { exact: true }).fill("66100");
  await page.getByLabel("Paese", { exact: true }).selectOption("IT");
  await page.getByRole("button", { name: "Salva indirizzo", exact: true }).click();
}
