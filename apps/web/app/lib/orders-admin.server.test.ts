import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { orderAdminAction } from "./orders-admin.server.js";
import {
  createValkeySessionStorage,
  type SessionClient,
  sessionContext,
} from "./session.server.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function context(role: "admin" | "customer" = "admin"): Promise<RouterContextProvider> {
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
  session.set("userId", "01JB2Q7Z8X4M3N5P6R7S8T9V0W");
  session.set("role", role);
  session.set("locale", "it");
  state.set(sessionContext, session);
  return state;
}

function post(fields: Record<string, string>, origin = "http://web.test"): Request {
  return new Request("http://web.test/it/admin/orders/01JB2Q7Z8X4M3N5P6R7S8T9V0A", {
    method: "POST",
    headers: { origin, "x-actor": "forged" },
    body: new URLSearchParams(fields),
  });
}

const order = {
  id: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
  userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
  lines: [
    {
      slug: "arrosticini-50",
      name: { it: "Arrosticini classici", en: "Classic arrosticini" },
      unitPriceCents: 2990,
      quantity: 2,
    },
  ],
  shippingAddress: {
    fullName: "Paola Marini",
    line1: "Via Arniense 21",
    city: "Chieti",
    postalCode: "66100",
    country: "IT",
    phone: "+39 333 0000005",
  },
  totalCents: 5980,
  currency: "EUR",
  status: "SHIPPED",
  shipment: { carrier: "BRT", trackingNumber: "BRT0001" },
  createdAt: "2026-10-09T10:00:00.000Z",
  paidAt: "2026-10-09T10:05:00.000Z",
};

describe("order administration", () => {
  it("requires a same-origin admin request before calling Ordering", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    const fields = { intent: "close", status: "DELIVERED" };

    await expect(
      orderAdminAction(
        post(fields, "http://evil.test"),
        await context(),
        "it",
        "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      orderAdminAction(post(fields), await context("customer"), "it", "01JB2Q7Z8X4M3N5P6R7S8T9V0A"),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ships an order with an optional tracking link", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(order));

    const result = await orderAdminAction(
      post({ intent: "ship", carrier: " BRT ", trackingNumber: "BRT0001", trackingUrl: " " }),
      await context(),
      "it",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    );

    if (!(result instanceof Response)) expect.fail("Expected redirect");
    expect(result.status).toBe(303);
    expect(result.headers.get("Location")).toBe(
      "/it/admin/orders/01JB2Q7Z8X4M3N5P6R7S8T9V0A?saved=shipment",
    );
    const outgoing: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(outgoing.method).toBe("PUT");
    expect(new URL(outgoing.url).pathname).toBe(
      "/ordering/admin/orders/01JB2Q7Z8X4M3N5P6R7S8T9V0A/shipment",
    );
    expect(await outgoing.json()).toEqual({ carrier: "BRT", trackingNumber: "BRT0001" });
    expect(outgoing.headers.get("x-actor")).toBe(
      '{"userId":"01JB2Q7Z8X4M3N5P6R7S8T9V0W","role":"admin"}',
    );
  });

  it("changes the shipping address and closes the order", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(order))
      .mockResolvedValueOnce(Response.json({ ...order, status: "LOST" }));

    const address = await orderAdminAction(
      post({
        intent: "address",
        fullName: "Paola Marini",
        line1: "Via Arniense 21",
        line2: "",
        city: "Chieti",
        postalCode: "66100",
        country: "it",
        phone: "+39 333 0000005",
      }),
      await context(),
      "en",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    );
    const closed = await orderAdminAction(
      post({ intent: "close", status: "LOST" }),
      await context(),
      "en",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    );

    if (!(address instanceof Response) || !(closed instanceof Response))
      expect.fail("Expected redirects");
    expect(address.headers.get("Location")).toBe(
      "/en/admin/orders/01JB2Q7Z8X4M3N5P6R7S8T9V0A?saved=address",
    );
    expect(closed.headers.get("Location")).toBe(
      "/en/admin/orders/01JB2Q7Z8X4M3N5P6R7S8T9V0A?saved=lost",
    );
    const addressRequest: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(await addressRequest.json()).toEqual({
      fullName: "Paola Marini",
      line1: "Via Arniense 21",
      city: "Chieti",
      postalCode: "66100",
      country: "IT",
      phone: "+39 333 0000005",
    });
    const closeRequest: Request = fetchMock.mock.calls[1]?.[0] as Request;
    expect(new URL(closeRequest.url).pathname).toBe(
      "/ordering/admin/orders/01JB2Q7Z8X4M3N5P6R7S8T9V0A/close",
    );
    expect(await closeRequest.json()).toEqual({ status: "LOST" });
  });

  it("returns field errors without calling Ordering", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");

    const result = await orderAdminAction(
      post({
        intent: "ship",
        carrier: "",
        trackingNumber: "BRT0001",
        trackingUrl: "http://vas.brt.it/BRT0001",
      }),
      await context(),
      "it",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    );
    const status = await orderAdminAction(
      post({ intent: "close", status: "CANCELLED" }),
      await context(),
      "it",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    );

    if (result instanceof Response || status instanceof Response) expect.fail("Expected errors");
    expect(result.init?.status).toBe(400);
    expect(result.data.errors).toEqual({ carrier: "carrierHint", trackingUrl: "trackingUrlHint" });
    expect(result.data.values.trackingNumber).toBe("BRT0001");
    expect(status.data.error).toBe("invalidForm");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports an order that changed state in the meantime", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json(
        {
          defined: true,
          code: "ORDER_INVALID_TRANSITION",
          status: 409,
          message: "ORDER_INVALID_TRANSITION",
        },
        { status: 409 },
      ),
    );

    const result = await orderAdminAction(
      post({ intent: "close", status: "DELIVERED" }),
      await context(),
      "it",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    );

    if (result instanceof Response) expect.fail("Expected an error");
    expect(result.init?.status).toBe(409);
    expect(result.data.error).toBe("orderInvalidTransition");
  });
});
