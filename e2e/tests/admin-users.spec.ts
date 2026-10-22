import { signIn } from "../fixtures/journeys.js";
import type { Customer } from "../fixtures/stack.js";
import { expect, test } from "../fixtures/test.js";

test("an admin suspends a signed-in customer and reactivates the account", async ({
  browser,
  page,
  stack,
}) => {
  const customer: Customer = await stack.createCustomer("Test", "Suspension");
  const orderId: string = await stack.createPaidOrder(customer);
  const customerContext = await browser.newContext({ baseURL: stack.origin });
  const customerPage = await customerContext.newPage();
  try {
    await signIn(customerPage, customer.email, customer.password);
    await signIn(page, stack.admin.email, stack.admin.password);
    await page.goto("/it/admin/users");
    const row = page.getByRole("row").filter({ hasText: customer.email });
    await expect(row).toContainText("Cliente");
    await expect(row).toContainText("Attivo");
    await row.getByRole("link", { name: "Test Suspension", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Test Suspension", exact: true })).toBeVisible();
    await expect(page.getByText(`Ordine ${orderId}`, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Sospendi account", exact: true }).click();
    await expect(
      page.getByText("L’account di Test Suspension è sospeso: non può più accedere.", {
        exact: true,
      }),
    ).toBeVisible();
    await page.goto("/it/admin/users?status=SUSPENDED");
    await expect(page.getByRole("row").filter({ hasText: customer.email })).toContainText(
      "Sospeso",
    );
    await page.goto("/it/admin/users?status=ACTIVE");
    await expect(page.getByRole("row").filter({ hasText: customer.email })).toHaveCount(0);

    await customerPage.goto("/it/orders");
    await expect(customerPage).toHaveURL(/\/it\/login$/);
    await customerPage.getByLabel("Email", { exact: true }).fill(customer.email);
    await customerPage.getByLabel("Password", { exact: true }).fill(customer.password);
    await customerPage.getByRole("button", { name: "Accedi", exact: true }).click();
    await expect(
      customerPage.getByText("Il tuo account è sospeso. Contatta il negozio per riattivarlo.", {
        exact: true,
      }),
    ).toBeVisible();

    await page.goto("/it/admin/users?status=SUSPENDED");
    await page
      .getByRole("row")
      .filter({ hasText: customer.email })
      .getByRole("link", { name: "Test Suspension", exact: true })
      .click();
    await page.getByRole("button", { name: "Riattiva account", exact: true }).click();
    await expect(
      page.getByText("L’account di Test Suspension è di nuovo attivo.", { exact: true }),
    ).toBeVisible();
    await signIn(customerPage, customer.email, customer.password);
  } finally {
    await customerContext.close();
  }
});

test("an admin account has no suspend action", async ({ page, stack }) => {
  await signIn(page, stack.admin.email, stack.admin.password);
  await page.goto("/it/admin/users");
  const row = page.getByRole("row").filter({ hasText: stack.admin.email });
  await expect(row).toContainText("Amministratore");
  await row.getByRole("link", { name: "Test Admin", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Test Admin", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sospendi account", exact: true })).toHaveCount(0);
});
