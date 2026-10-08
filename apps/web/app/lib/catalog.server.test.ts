import type { ProductDto } from "@arrosticini/contracts";
import { ORPCError } from "@orpc/client";
import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { loader as productLoader } from "../routes/product.js";
import { loader as productsLoader } from "../routes/products.js";
import { api } from "./api.server.js";

const product: ProductDto = {
  slug: "vino",
  name: { it: "Vino locale", en: "Local wine" },
  description: { it: "Vino rosso abruzzese", en: "Red wine from Abruzzo" },
  priceCents: 500,
  currency: "EUR",
  images: [{ id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W", key: "products/vino/red.webp" }],
  status: "ACTIVE",
  updatedAt: "2026-10-08T10:00:00.000Z",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("public catalog loaders", () => {
  it("forwards only the trimmed search and request ID, with no browser actor", async () => {
    vi.stubEnv("API_URL", "http://api.test:4100");
    vi.stubEnv("MEDIA_BASE_URL", "http://media.test/media/");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ items: [product] }));
    const result = await productsLoader({
      request: new Request("http://web.test/it/products?q=%20vino%20&status=DRAFT", {
        headers: { "x-request-id": "request-123", "x-actor": "admin", cookie: "secret" },
      }),
      params: { lang: "it" },
      url: new URL("http://web.test/it/products?q=%20vino%20&status=DRAFT"),
      pattern: "/:lang/products",
      context: new RouterContextProvider(),
    });

    expect(result.data).toEqual({
      items: [{ product, image: "http://media.test/media/products/vino/red.webp" }],
      query: "vino",
      invalidSearch: false,
    });
    const outbound: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(outbound.url).toBe("http://api.test:4100/catalog/products?q=vino");
    expect(outbound.headers.get("x-request-id")).toBe("request-123");
    expect(outbound.headers.has("x-actor")).toBe(false);
    expect(outbound.headers.has("cookie")).toBe(false);
  });

  it("returns the backend empty result without substituting fixtures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [] }));
    const result = await productsLoader({
      request: new Request("http://web.test/en/products?q=missing"),
      params: { lang: "en" },
      url: new URL("http://web.test/en/products?q=missing"),
      pattern: "/:lang/products",
      context: new RouterContextProvider(),
    });
    expect(result.data).toEqual({ items: [], query: "missing", invalidSearch: false });
  });

  it("returns search validation errors with status 400", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { code: "BAD_REQUEST", status: 400, message: "Invalid input" },
        { status: 400 },
      ),
    );
    const result = await productsLoader({
      request: new Request(`http://web.test/it/products?q=${"a".repeat(101)}`),
      params: { lang: "it" },
      url: new URL(`http://web.test/it/products?q=${"a".repeat(101)}`),
      pattern: "/:lang/products",
      context: new RouterContextProvider(),
    });
    expect(result.data.invalidSearch).toBe(true);
    expect(result.init?.status).toBe(400);
  });

  it("loads product details and resolves media URLs", async () => {
    vi.stubEnv("MEDIA_BASE_URL", "/images");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(product));
    const result = await productLoader({
      request: new Request("http://web.test/en/products/vino"),
      params: { lang: "en", slug: "vino" },
      url: new URL("http://web.test/en/products/vino"),
      pattern: "/:lang/products/:slug",
      context: new RouterContextProvider(),
    });
    expect(result).toEqual({ product, images: ["/images/products/vino/red.webp"] });
  });

  it("returns 404 for hidden or unknown products", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { code: "PRODUCT_NOT_FOUND", status: 404, message: "Missing product", defined: true },
        { status: 404 },
      ),
    );
    await expect(
      productLoader({
        request: new Request("http://web.test/it/products/missing"),
        params: { lang: "it", slug: "missing" },
        url: new URL("http://web.test/it/products/missing"),
        pattern: "/:lang/products/:slug",
        context: new RouterContextProvider(),
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects malformed slugs before calling the API", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    await expect(
      productLoader({
        request: new Request("http://web.test/it/products/Invalid_Slug"),
        params: { lang: "it", slug: "Invalid_Slug" },
        url: new URL("http://web.test/it/products/Invalid_Slug"),
        pattern: "/:lang/products/:slug",
        context: new RouterContextProvider(),
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates unexpected failures to the error boundary", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { code: "INTERNAL_SERVER_ERROR", status: 500, message: "Internal error" },
        { status: 500 },
      ),
    );
    await expect(
      productsLoader({
        request: new Request("http://web.test/it/products"),
        params: { lang: "it" },
        url: new URL("http://web.test/it/products"),
        pattern: "/:lang/products",
        context: new RouterContextProvider(),
      }),
    ).rejects.toBeInstanceOf(ORPCError);
  });

  it("uses API_PORT for the local backend when API_URL is unset", async () => {
    vi.stubEnv("API_URL", undefined);
    vi.stubEnv("API_PORT", "4100");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ items: [] }));
    await api(new Request("http://web.test")).catalog.listProducts({});
    const outbound: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(outbound.url).toBe("http://localhost:4100/catalog/products");
  });
});
