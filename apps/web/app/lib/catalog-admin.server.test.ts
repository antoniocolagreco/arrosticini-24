import type { ProductDto } from "@arrosticini/contracts";
import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { catalogAdminAction, requireAdmin } from "./catalog-admin.server.js";
import {
  createValkeySessionStorage,
  type SessionClient,
  sessionContext,
} from "./session.server.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function context(
  role: "admin" | "customer" | null = "admin",
): Promise<RouterContextProvider> {
  const client: SessionClient = {
    getex: async () => null,
    set: async () => undefined,
    del: async () => undefined,
  };
  const storage = createValkeySessionStorage(
    client,
    "a-test-secret-with-at-least-32-characters",
    false,
  );
  const state: RouterContextProvider = new RouterContextProvider();
  const session = await storage.getSession();
  if (role) {
    session.set("userId", "01JB2Q7Z8X4M3N5P6R7S8T9V0W");
    session.set("role", role);
    session.set("locale", "it");
  }
  state.set(sessionContext, session);
  return state;
}

function post(fields: Record<string, string> | FormData, origin = "http://web.test"): Request {
  return new Request("http://web.test/it/admin/products/new", {
    method: "POST",
    headers: { origin, "x-actor": "forged" },
    body: fields instanceof FormData ? fields : new URLSearchParams(fields),
  });
}

const fields: Record<string, string> = {
  intent: "save",
  slug: "test-pack",
  nameIt: "Confezione di prova",
  nameEn: "Test pack",
  descriptionIt: "Descrizione italiana.",
  descriptionEn: "English description.",
  price: "37,50",
  pieces: "75",
  status: "DRAFT",
};

const product: ProductDto = {
  slug: "test-pack",
  name: { it: "Confezione di prova", en: "Test pack" },
  description: { it: "Descrizione italiana.", en: "English description." },
  priceCents: 3750,
  pieces: 75,
  currency: "EUR",
  status: "DRAFT",
  images: [],
  updatedAt: "2026-10-09T12:00:00Z",
};

describe("catalog administration", () => {
  it("requires an admin session for page access", async () => {
    const guest: RouterContextProvider = await context(null);
    const customer: RouterContextProvider = await context("customer");
    const admin: RouterContextProvider = await context();
    expect(() => requireAdmin(guest, "en")).toThrow();
    expect(() => requireAdmin(customer, "it")).toThrow();
    expect(requireAdmin(admin, "it").role).toBe("admin");
  });

  it("rejects unauthenticated, customer and cross-origin mutations before calling Catalog", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    await expect(catalogAdminAction(post(fields), await context(null), "en")).rejects.toMatchObject(
      { status: 302, headers: expect.any(Headers) },
    );
    await expect(
      catalogAdminAction(post(fields), await context("customer"), "it"),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      catalogAdminAction(post(fields, "http://evil.test"), await context(), "it"),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates bilingual products with exact cents and the trusted session actor", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(product, { status: 201 }));
    const response = await catalogAdminAction(
      post({ ...fields, role: "customer", userId: "forged" }),
      await context(),
      "en",
    );
    expect(response).toMatchObject({ status: 303 });
    expect((response as Response).headers.get("Location")).toBe(
      "/en/admin/products/test-pack?created=1",
    );
    const sent: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(sent.method).toBe("POST");
    expect(await sent.json()).toEqual({
      slug: "test-pack",
      name: { it: "Confezione di prova", en: "Test pack" },
      description: { it: "Descrizione italiana.", en: "English description." },
      priceCents: 3750,
      pieces: 75,
      status: "DRAFT",
    });
    expect(JSON.parse(sent.headers.get("x-actor") ?? "{}")).toEqual({
      userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
      role: "admin",
    });
  });

  it.each([
    ["price", "37.501", "price"],
    ["price", "", "price"],
    ["price", "-1", "price"],
    ["price", "1e2", "price"],
    ["pieces", "1.5", "pieces"],
    ["pieces", "0", "pieces"],
    ["slug", "Invalid Slug", "slug"],
    ["nameEn", "", "nameEn"],
    ["descriptionIt", "", "descriptionIt"],
    ["status", "PUBLISHED", "status"],
  ])("preserves values and rejects invalid %s=%s", async (field, value, error) => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    const response = await catalogAdminAction(
      post({ ...fields, [field]: value }),
      await context(),
      "it",
    );
    expect(response).toMatchObject({
      data: { values: { [field]: value }, errors: { [error]: `${error}Hint` } },
      init: { status: 400 },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the route slug and explicitly clears an empty piece count on update", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(product));
    const response = await catalogAdminAction(
      post({ ...fields, slug: "forged-slug", pieces: "", price: "0.01" }),
      await context(),
      "it",
      "test-pack",
    );
    expect(response).toMatchObject({ data: { success: "saved" } });
    const sent: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(sent.url).toContain("/catalog/products/test-pack");
    expect(sent.method).toBe("PATCH");
    expect(await sent.json()).toMatchObject({ pieces: null, priceCents: 1 });
  });

  it("reports a duplicate slug without losing the entered text", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { defined: true, code: "PRODUCT_SLUG_TAKEN", status: 409, message: "taken" },
        { status: 409 },
      ),
    );
    const response = await catalogAdminAction(post(fields), await context(), "it");
    expect(response).toMatchObject({
      data: { errors: { slug: "slugTaken" }, values: { nameIt: "Confezione di prova" } },
      init: { status: 409 },
    });
  });

  it("archives with the previous name and status loaded from Catalog for undo", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => Response.json(product));
    const response = await catalogAdminAction(
      post({ intent: "archive", slug: "test-pack", status: "ACTIVE", name: "forged" }),
      await context(),
      "it",
    );
    expect(response).toMatchObject({
      data: {
        archived: {
          slug: "test-pack",
          name: { it: "Confezione di prova", en: "Test pack" },
          status: "DRAFT",
        },
      },
    });
    const sent: Request = fetchMock.mock.calls[1]?.[0] as Request;
    expect(await sent.json()).toEqual({ status: "ARCHIVED" });
  });

  it("rejects a restore without a status instead of issuing an empty update", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    const response = await catalogAdminAction(
      post({ intent: "restore", slug: "test-pack" }),
      await context(),
      "it",
    );
    expect(response).toMatchObject({ data: { error: "invalidForm" }, init: { status: 400 } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards image bytes as multipart with the route slug", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(product, { status: 201 }));
    const form: FormData = new FormData();
    form.set("intent", "upload");
    form.set("slug", "forged");
    form.set(
      "file",
      new File([new Uint8Array([137, 80, 78, 71])], "sample.png", { type: "image/png" }),
    );
    const response = await catalogAdminAction(post(form), await context(), "it", "test-pack");
    expect(response).toMatchObject({ data: { success: "imageAdded" } });
    const sent: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(sent.url).toContain("/catalog/products/test-pack/images");
    const forwarded: FormData = await sent.formData();
    const file: File = forwarded.get("file") as File;
    expect(file.type).toBe("image/png");
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  it.each(["text/plain", "image/svg+xml"])(
    "rejects unsupported %s uploads without contacting Catalog",
    async (type) => {
      const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
      const form: FormData = new FormData();
      form.set("intent", "upload");
      form.set("file", new File(["text"], "sample.txt", { type }));
      expect(
        await catalogAdminAction(post(form), await context(), "it", "test-pack"),
      ).toMatchObject({ data: { error: "imageHint" }, init: { status: 400 } });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("reports invalid real image content from Catalog", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { defined: true, code: "INVALID_IMAGE", status: 422, message: "invalid" },
        { status: 422 },
      ),
    );
    const form: FormData = new FormData();
    form.set("intent", "upload");
    form.set("file", new File(["not an image"], "fake.png", { type: "image/png" }));
    expect(await catalogAdminAction(post(form), await context(), "it", "test-pack")).toMatchObject({
      data: { error: "invalidImage" },
      init: { status: 422 },
    });
  });

  it("deletes only a validated image id using the route product", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(product));
    const response = await catalogAdminAction(
      post({ intent: "removeImage", imageId: "01JB2Q7Z8X4M3N5P6R7S8T9V0W", slug: "forged" }),
      await context(),
      "it",
      "test-pack",
    );
    expect(response).toMatchObject({ data: { success: "imageRemoved" } });
    const sent: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(sent.method).toBe("DELETE");
    expect(sent.url).toContain("/catalog/products/test-pack/images/01JB2Q7Z8X4M3N5P6R7S8T9V0W");
  });
});
