import { signIn } from "../fixtures/journeys.js";
import type { Customer } from "../fixtures/stack.js";
import { expect, test } from "../fixtures/test.js";

test("an admin corrects the address, ships and delivers an order that the customer follows", async ({
  browser,
  page,
  stack,
}) => {
  const customer: Customer = await stack.createCustomer("Test", "Fulfilment");
  const orderId: string = await stack.createPaidOrder(customer);
  await signIn(page, stack.admin.email, stack.admin.password);
  await page.goto("/it/admin/orders");
  await page.getByLabel("Stato", { exact: true }).selectOption("PAID");
  await page.getByRole("button", { name: "Filtra ordini", exact: true }).click();
  await expect(page).toHaveURL(/\/it\/admin\/orders\?status=PAID$/);
  const row = page.getByRole("row").filter({ hasText: `Ordine ${orderId}` });
  await expect(row).toContainText("Test Fulfilment");
  await expect(row).toContainText("Pagato");
  await row.getByRole("link").first().click();
  await expect(page).toHaveURL(new RegExp(`/it/admin/orders/${orderId}$`));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ordine del");
  await page.getByRole("button", { name: "Modifica indirizzo di spedizione", exact: true }).click();
  await page.getByLabel("Città", { exact: true }).fill("Vasto");
  await page.getByRole("button", { name: "Salva indirizzo", exact: true }).click();
  await expect(
    page.getByText("L’indirizzo di spedizione è stato aggiornato.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".address-view")).toContainText("Vasto");
  await page.getByLabel("Corriere", { exact: true }).fill("BRT");
  await page.getByLabel("Numero di tracking (facoltativo)", { exact: true }).fill("E2E123");
  await page
    .getByLabel("Link di tracking (facoltativo)", { exact: true })
    .fill("https://tracking.example.com/E2E123");
  await page.getByRole("button", { name: "Segna come spedito", exact: true }).click();
  await expect(page.getByText("La spedizione è stata registrata.", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Modifica indirizzo di spedizione", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Segna come consegnato", exact: true }).click();
  await expect(
    page.getByText("L’ordine è stato chiuso come consegnato.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".order-detail .status-badge")).toContainText("Consegnato");
  await page.goto("/it/admin/orders?status=DELIVERED");
  await expect(page.getByRole("row").filter({ hasText: `Ordine ${orderId}` })).toBeVisible();
  await page.goto("/it/admin/orders?status=PAID");
  await expect(page.getByRole("row").filter({ hasText: `Ordine ${orderId}` })).toHaveCount(0);

  const customerContext = await browser.newContext({ baseURL: stack.origin });
  const customerPage = await customerContext.newPage();
  try {
    await signIn(customerPage, customer.email, customer.password);
    await customerPage.goto("/it/orders");
    await customerPage
      .getByRole("link")
      .filter({ hasText: `Ordine ${orderId}` })
      .click();
    await expect(customerPage).toHaveURL(new RegExp(`/it/orders/${orderId}$`));
    await expect(
      customerPage.getByText("Il tuo ordine è stato consegnato.", { exact: true }),
    ).toBeVisible();
    await expect(customerPage.locator(".address-view")).toContainText("Vasto");
    await expect(customerPage.getByText("BRT", { exact: true })).toBeVisible();
    await expect(
      customerPage.getByRole("link", { name: "Segui la spedizione", exact: true }),
    ).toHaveAttribute("href", "https://tracking.example.com/E2E123");
  } finally {
    await customerContext.close();
  }
});

test("an admin rejects an invalid order status filter", async ({ page, stack }) => {
  await signIn(page, stack.admin.email, stack.admin.password);
  const response = await page.goto("/it/admin/orders?status=UNKNOWN");
  expect(response?.status()).toBe(400);
});
