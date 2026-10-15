import { randomUUID } from "node:crypto";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../fixtures/test.js";

interface ButtonAppearance {
  color: string;
  background: string;
  border: string;
  width: number;
  height: number;
}

function buttonAppearance(buttons: HTMLElement[]): ButtonAppearance[] {
  return buttons.map((button) => {
    const style: CSSStyleDeclaration = getComputedStyle(button);
    const bounds: DOMRect = button.getBoundingClientRect();
    return {
      color: style.color,
      background: style.backgroundColor,
      border: style.borderColor,
      width: bounds.width,
      height: bounds.height,
    };
  });
}

async function expectStablePendingControls(
  page: Page,
  controls: Locator,
  submit: string,
  invalid: string,
): Promise<void> {
  await expect(controls).not.toHaveCount(0);
  const before: ButtonAppearance[] = await controls.evaluateAll(buttonAppearance);
  const gate: PromiseWithResolvers<void> = Promise.withResolvers<void>();
  const requests: RegExp = /\/it\/account(?:[/.?]|$)/;
  await page.route(requests, async (route) => {
    if (route.request().method() === "POST") await gate.promise;
    await route.continue();
  });
  try {
    await page.getByRole("button", { name: submit, exact: true }).click();
    await expect(page.locator(".form-actions button[type=submit]")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await page.waitForTimeout(250);
    expect(await controls.evaluateAll(buttonAppearance)).toEqual(before);
    expect(
      await controls.evaluateAll((buttons) =>
        buttons.every((button) => (button as HTMLButtonElement).disabled),
      ),
    ).toBe(true);
  } finally {
    gate.resolve();
  }
  await expect(page.locator(invalid)).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(invalid)).toBeFocused();
  await page.unroute(requests);
}

async function register(page: Page, firstName: string, lastName: string): Promise<void> {
  await page.goto("/it/register");
  await page.getByLabel("Email", { exact: true }).fill(`${randomUUID()}@example.com`);
  await page.getByLabel("Nome", { exact: true }).fill(firstName);
  await page.getByLabel("Cognome", { exact: true }).fill(lastName);
  await page.getByLabel("Password", { exact: true }).fill(randomUUID());
  await page.getByRole("button", { name: "Crea account", exact: true }).click();
  await expect(page).toHaveURL(/\/it\/account$/);
  await expect(page.getByRole("heading", { name: `Ciao, ${firstName}.` })).toBeVisible();
}

async function addAddress(page: Page): Promise<void> {
  await page.getByLabel("Nome e cognome del destinatario", { exact: true }).fill("Test Customer");
  await page.getByLabel("Telefono del destinatario", { exact: true }).fill("+390871000000");
  await page.getByLabel("Via e numero civico", { exact: true }).fill("Via Test 1");
  await page.getByLabel("Città", { exact: true }).fill("Chieti");
  await page.getByLabel("Codice postale", { exact: true }).fill("66100");
  await page.getByLabel("Paese", { exact: true }).selectOption("IT");
  await page.getByRole("button", { name: "Salva indirizzo", exact: true }).click();
  await expect(page.getByRole("radio")).toBeChecked();
  await expect(page.getByRole("button", { name: "Vai al pagamento", exact: true })).toBeEnabled();
}

test("registration merges the anonymous cart and saves a checkout address", async ({ page }) => {
  await page.goto("/it/products");
  await page
    .getByRole("article")
    .filter({ hasText: "Arrosticini di prova" })
    .getByRole("button", { name: "Aggiungi", exact: true })
    .click();
  await expect(page.locator(".cart-count")).toHaveText("1");
  await page.goto("/it/cart");
  await page.getByRole("button", { name: "Aumenta", exact: true }).click();
  await expect(page.getByLabel("Quantità", { exact: true })).toHaveText("2");
  await register(page, "Test", "Registration");
  await expect(page.locator(".cart-count")).toHaveText("2");
  await page.goto("/it/cart");
  await expect(page.getByLabel("Quantità", { exact: true })).toHaveText("2");
  await expect(
    page.getByRole("heading", { name: "Arrosticini di prova", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Vai al checkout", exact: true }).click();
  await expect(page).toHaveURL(/\/it\/checkout$/);
  await addAddress(page);
  await page.goto("/it/account/addresses");
  await expect(page.getByText("Via Test 1", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page).toHaveURL(/\/it\/login$/);
  await page.goto("/it/cart");
  await expect(page.locator(".cart-row")).toHaveCount(0);
});

test("language switching preserves the product query, cart and preferred locale", async ({
  page,
}) => {
  await page.goto("/it/products?q=arrosticini");
  await page
    .getByRole("article")
    .filter({ hasText: "Arrosticini di prova" })
    .getByRole("button", { name: "Aggiungi", exact: true })
    .click();
  await expect(page.locator(".cart-count")).toHaveText("1");
  await page.getByRole("button", { name: "Cambia lingua", exact: true }).click();
  await page.getByRole("menuitem", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/products\?q=arrosticini$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Test arrosticini", exact: true })).toBeVisible();
  await expect(page.locator(".cart-count")).toHaveText("1");
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await page.goto("/en/cart");
  await expect(page.getByRole("heading", { name: "Test arrosticini", exact: true })).toBeVisible();
  await expect(page.getByLabel("Quantity", { exact: true })).toHaveText("1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("profile and address controls retain their appearance while a save is pending", async ({
  page,
}) => {
  await register(page, "Test", "Pending");
  await page.getByRole("button", { name: "Modifica i tuoi dati", exact: true }).click();
  await page.locator("#profile-firstName").fill(" ");
  await expectStablePendingControls(
    page,
    page.locator(".account-nav button,.panel .icon-action,.form-actions button[type=button]"),
    "Salva",
    "#profile-firstName",
  );
  await page.getByRole("button", { name: "Annulla", exact: true }).click();
  await page.goto("/it/products");
  await page
    .getByRole("article")
    .filter({ hasText: "Arrosticini di prova" })
    .getByRole("button", { name: "Aggiungi", exact: true })
    .click();
  await expect(page.locator(".cart-count")).toHaveText("1");
  await page.goto("/it/checkout");
  await addAddress(page);
  await page.goto("/it/account/addresses");
  await page
    .getByRole("button", { name: "Modifica l’indirizzo di Test Customer", exact: true })
    .click();
  await page.locator("#address-fullName").fill(" ");
  await expectStablePendingControls(
    page,
    page.locator(
      ".account-nav button,.tile-add,.tile .icon-action,.form-actions button[type=button]",
    ),
    "Salva indirizzo",
    "#address-fullName",
  );
});

test("hosted Stripe test payment reaches PAID and clears the cart through the webhook", async ({
  page,
  stack,
}) => {
  test.skip(
    !stack.stripe,
    "Set STRIPE_SECRET_KEY to a Stripe test-mode key to run hosted payment.",
  );
  await register(page, "Test", "Payment");
  await page.goto("/it/products");
  await page
    .getByRole("article")
    .filter({ hasText: "Arrosticini di prova" })
    .getByRole("button", { name: "Aggiungi", exact: true })
    .click();
  await expect(page.locator(".cart-count")).toHaveText("1");
  await page.goto("/it/checkout");
  await addAddress(page);
  await page.getByRole("button", { name: "Vai al pagamento", exact: true }).click();
  await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//);
  const checkoutUrl: string = page.url();
  const sessionId: string | undefined = checkoutUrl.match(/cs_test_[a-zA-Z0-9]+/)?.[0];
  expect(sessionId).toBeDefined();
  await page.locator("#cardNumber").fill("4242424242424242");
  await page.locator("#cardExpiry").fill("1230");
  await page.locator("#cardCvc").fill("123");
  await page.locator("#billingName").fill("Test Payment");
  await page.locator("#billingCountry").selectOption("IT");
  if (await page.locator("#billingPostalCode").isVisible())
    await page.locator("#billingPostalCode").fill("66100");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(new RegExp(`^${stack.origin}/it/orders/[A-Z0-9]+`), {
    timeout: 60000,
  });
  await expect
    .poll(
      async () => {
        try {
          await stack.deliverPaidEvent(sessionId ?? "");
          return true;
        } catch {
          return false;
        }
      },
      {
        timeout: 30000,
        message: "Stripe must confirm the actual test payment and expose its completion event",
      },
    )
    .toBe(true);
  await expect(page.locator(".payment-paid")).toContainText("Pagamento ricevuto", {
    timeout: 15000,
  });
  await expect(page.locator(".cart-count")).toHaveCount(0);
  await stack.deliverPaidEvent(sessionId ?? "");
  await page.reload();
  await expect(page.locator(".payment-paid")).toBeVisible();
  await page.goto("/it/cart");
  await expect(page.locator(".cart-row")).toHaveCount(0);
});
