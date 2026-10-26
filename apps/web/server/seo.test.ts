import type { ProductDto } from "@arrosticini/contracts";
import { createLogger, Lifecycle } from "@arrosticini/ops";
import request, { type Response as TestResponse } from "supertest";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { createApp } from "./app.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("search discovery", () => {
  const logger: ReturnType<typeof createLogger> = createLogger({
    service: "web",
    version: "test",
    level: "silent",
    pretty: false,
  });

  it("uses the configured origin for robots instead of the incoming host", async () => {
    vi.stubEnv("PUBLIC_ORIGIN", "https://shop.example.com");
    const response: TestResponse = await request(createApp(logger, new Lifecycle()))
      .get("/robots.txt")
      .set("Host", "internal-alb.example.com");
    expect(response.status).toBe(200);
    expect(response.text).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://shop.example.com/sitemap.xml\n",
    );
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("paginates through the catalog and includes only active product URLs", async () => {
    vi.stubEnv("PUBLIC_ORIGIN", "https://shop.example.com");
    vi.stubEnv("API_URL", "https://api.example.com");
    const firstProduct: ProductDto = {
      slug: "arrosticini-75",
      name: { it: "Arrosticini 75", en: "Arrosticini 75" },
      description: { it: "Confezione da 75 pezzi", en: "75-piece pack" },
      priceCents: 3750,
      currency: "EUR",
      status: "ACTIVE",
      images: [],
      updatedAt: "2026-10-26T00:00:00.000Z",
    };
    const secondProduct: ProductDto = {
      slug: "vino-rosso",
      name: { it: "Vino rosso", en: "Red wine" },
      description: { it: "Una bottiglia", en: "One bottle" },
      priceCents: 1200,
      currency: "EUR",
      status: "ARCHIVED",
      images: [],
      updatedAt: "2026-10-25T00:00:00.000Z",
    };
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ items: [firstProduct], nextCursor: "next-page" }))
      .mockResolvedValueOnce(Response.json({ items: [secondProduct] }));
    const response: TestResponse = await request(createApp(logger, new Lifecycle())).get(
      "/sitemap.xml",
    );
    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(response.text).toContain("https://shop.example.com/it/products/arrosticini-75");
    expect(response.text).toContain("https://shop.example.com/en/products/arrosticini-75");
    expect(response.text).not.toContain("vino-rosso");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const outbound: Request = fetchMock.mock.calls[1]?.[0] as Request;
    expect(new URL(outbound.url).searchParams.get("cursor")).toBe("next-page");
  });

  it("returns a retryable failure instead of a partial sitemap when the catalog fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Catalog unavailable"));
    const response: TestResponse = await request(createApp(logger, new Lifecycle())).get(
      "/sitemap.xml",
    );
    expect(response.status).toBe(503);
    expect(response.headers["retry-after"]).toBe("60");
    expect(response.headers["cache-control"]).toBeUndefined();
    expect(response.text).not.toContain("<urlset");
  });
});
