import type { APIResponse } from "@playwright/test";
import { expect, test } from "../fixtures/test.js";

test("storefront metadata is rendered for crawlers and updates during navigation", async ({
  page,
  request,
  stack,
}) => {
  const response: APIResponse = await request.get("/it?utm_source=telegram");
  const html: string = await response.text();
  expect(html).toContain('<meta property="og:title"');
  expect(html).toContain('<meta property="og:image"');
  expect(html).toContain(`${stack.origin}/images/social-card.png`);
  expect(html).toContain('name="robots" content="index, follow, max-image-preview:large"');
  await page.goto("/it?utm_source=telegram");
  await expect(page).toHaveTitle("Arrosticini abruzzesi online | Arrosticini 24ore");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${stack.origin}/it`);
  await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", `${stack.origin}/en`);
  await page.locator(".hero-cta").click();
  await expect(page).toHaveTitle("Arrosticini, vini e accessori per la brace | Arrosticini 24ore");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${stack.origin}/it/products`,
  );
  await page.goto("/en");
  await expect(page).toHaveTitle("Buy Abruzzo arrosticini online | Arrosticini 24ore");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_GB");
  const image: APIResponse = await request.get("/images/social-card.png");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
});

test("product pages expose localized prices, breadcrumbs and share metadata", async ({
  page,
  request,
  stack,
}) => {
  const response: APIResponse = await request.get("/en/products/e2e-arrosticini");
  expect(await response.text()).toContain('type="application/ld+json"');
  await page.goto("/en/products/e2e-arrosticini");
  await expect(page).toHaveTitle("Test arrosticini | Arrosticini 24ore");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "index, follow, max-image-preview:large",
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Test arrosticini | Arrosticini 24ore",
  );
  await expect(page.locator('link[hreflang="it"]')).toHaveAttribute(
    "href",
    `${stack.origin}/it/products/e2e-arrosticini`,
  );
  const schemas: unknown[] = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent ?? "null") as unknown),
    );
  expect(schemas).toContainEqual({
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Test arrosticini",
    description: "Arrosticini for the purchase journey.",
    sku: "e2e-arrosticini",
    url: `${stack.origin}/en/products/e2e-arrosticini`,
    offers: {
      "@type": "Offer",
      url: `${stack.origin}/en/products/e2e-arrosticini`,
      priceCurrency: "EUR",
      price: "37.50",
      seller: { "@type": "Organization", name: "Arrosticini 24ore" },
    },
  });
  expect(schemas).toContainEqual(expect.objectContaining({ "@type": "BreadcrumbList" }));
});

test("private, search and error pages are excluded from indexing", async ({ page }) => {
  for (const pathname of [
    "/it/login",
    "/it/cart",
    "/it/stress",
    "/it/products?q=arrosticini",
    "/it/products/missing-product",
    "/it/missing-page",
  ]) {
    await page.goto(pathname);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
    await expect(page.locator("link[hreflang]")).toHaveCount(0);
  }
});

test("discovery endpoints list public localized pages without session cookies", async ({
  request,
  stack,
}) => {
  const robots: APIResponse = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(`Sitemap: ${stack.origin}/sitemap.xml`);
  expect(robots.headers()["set-cookie"]).toBeUndefined();
  const sitemap: APIResponse = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("application/xml");
  expect(sitemap.headers()["set-cookie"]).toBeUndefined();
  const xml: string = await sitemap.text();
  expect(xml).toContain(`<loc>${stack.origin}/it/products/e2e-arrosticini</loc>`);
  expect(xml).toContain(`<loc>${stack.origin}/en/products/e2e-arrosticini</loc>`);
  expect(xml).toContain(`<loc>${stack.origin}/it/story</loc>`);
  expect(xml).not.toMatch(/\/(admin|account|cart|checkout|stress|login)/);
  const health: APIResponse = await request.get("/healthz");
  expect(health.headers()["x-robots-tag"]).toBe("noindex");
});
