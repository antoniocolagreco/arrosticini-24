import { randomUUID } from "node:crypto";
import { fillAddress, signIn } from "../fixtures/journeys.js";
import type { Customer } from "../fixtures/stack.js";
import { expect, test } from "../fixtures/test.js";

test("login rejects a wrong password, then signs the customer in and out", async ({
  page,
  stack,
}) => {
  const customer: Customer = await stack.createCustomer("Test", "Login");
  await page.goto("/it/login");
  await page.getByLabel("Email", { exact: true }).fill(customer.email);
  await page.getByLabel("Password", { exact: true }).fill(randomUUID());
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(
    page.getByText("Email o password non corrette. Controllale e riprova.", { exact: true }),
  ).toBeVisible();
  await signIn(page, customer.email, customer.password);
  await expect(page.getByRole("heading", { name: "Ciao, Test." })).toBeVisible();
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page).toHaveURL(/\/it\/login$/);
  await page.goto("/it/account");
  await expect(page).toHaveURL(/\/it\/login$/);
});

test("customer pages send anonymous visitors to the login", async ({ page }) => {
  for (const path of [
    "/it/checkout",
    "/it/orders",
    "/it/account",
    "/it/account/addresses",
    "/it/account/payment-methods",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/it\/login$/);
  }
});

test("a customer adds, edits, makes default and removes addresses", async ({ page, stack }) => {
  const customer: Customer = await stack.createCustomer("Test", "Addresses");
  await signIn(page, customer.email, customer.password);
  await page.goto("/it/account/addresses");
  await expect(page.getByRole("heading", { name: "Nessun indirizzo salvato." })).toBeVisible();
  await page.getByRole("button", { name: "Aggiungi indirizzo", exact: true }).click();
  await fillAddress(page, "Prima Destinataria", "Chieti");
  await expect(page.locator(".tile").filter({ hasText: "Prima Destinataria" })).toContainText(
    "Predefinito",
  );
  await page.locator(".tile-add").click();
  await fillAddress(page, "Seconda Destinataria", "Pescara");
  await expect(page.locator(".tile").filter({ hasText: "Seconda Destinataria" })).toBeVisible();
  await page
    .getByRole("button", { name: "Modifica l’indirizzo di Seconda Destinataria", exact: true })
    .click();
  await page.getByLabel("Città", { exact: true }).fill("Lanciano");
  await page.getByRole("button", { name: "Salva indirizzo", exact: true }).click();
  await expect(page.locator(".tile").filter({ hasText: "Seconda Destinataria" })).toContainText(
    "Lanciano",
  );
  await page
    .getByRole("button", {
      name: "Rendi predefinito l’indirizzo di Seconda Destinataria",
      exact: true,
    })
    .click();
  await expect(page.locator(".tile").filter({ hasText: "Seconda Destinataria" })).toContainText(
    "Predefinito",
  );
  await page
    .getByRole("button", { name: "Rimuovi l’indirizzo di Prima Destinataria", exact: true })
    .click();
  await expect(page.locator(".tile").filter({ hasText: "Prima Destinataria" })).toHaveCount(0);
  await expect(page.locator(".tile").filter({ hasText: "Seconda Destinataria" })).toBeVisible();
});

test("a customer changes profile and password, then signs in with the new password", async ({
  page,
  stack,
}) => {
  const customer: Customer = await stack.createCustomer("Test", "Profile");
  const newPassword: string = randomUUID();
  await signIn(page, customer.email, customer.password);
  await page.getByRole("button", { name: "Modifica i tuoi dati", exact: true }).click();
  await page.locator("#profile-firstName").fill("Cambiato");
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ciao, Cambiato." })).toBeVisible();
  await page.getByRole("button", { name: "Cambia password", exact: true }).click();
  await page.getByLabel("Password attuale", { exact: true }).fill(customer.password);
  await page.getByLabel("Nuova password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(page.getByText("Password aggiornata.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page).toHaveURL(/\/it\/login$/);
  await signIn(page, customer.email, newPassword);
  await expect(page.getByRole("heading", { name: "Ciao, Cambiato." })).toBeVisible();
});

test("a customer without orders sees the empty order history", async ({ page, stack }) => {
  const customer: Customer = await stack.createCustomer("Test", "History");
  await signIn(page, customer.email, customer.password);
  await page.goto("/it/orders");
  await expect(page.getByRole("heading", { name: "Non hai ancora ordini." })).toBeVisible();
});

test("payment methods open the Stripe card setup", async ({ page, stack }) => {
  test.skip(
    !stack.stripe,
    "Set STRIPE_SECRET_KEY to a Stripe test-mode key to run the card setup.",
  );
  const customer: Customer = await stack.createCustomer("Test", "Cards");
  await signIn(page, customer.email, customer.password);
  await page.goto("/it/account/payment-methods");
  await expect(page.getByRole("heading", { name: "Nessuna carta salvata." })).toBeVisible();
  await page.getByRole("button", { name: "Aggiungi carta", exact: true }).click();
  await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//);
});
