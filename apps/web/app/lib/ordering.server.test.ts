import type { AddressDto, OrderDto } from "@arrosticini/contracts";
import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { checkoutAction } from "./ordering.server.js";
import {
  createValkeySessionStorage,
  type SessionClient,
  sessionContext,
  sessionStorageContext,
} from "./session.server.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const order: OrderDto = {
  id: "01JB2Q7Z8X4M3N5P6R7S8T9V0Z",
  userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
  lines: [
    {
      slug: "arrosticini-75",
      name: { it: "Arrosticini 75 pezzi", en: "Arrosticini 75 pieces" },
      unitPriceCents: 3750,
      quantity: 2,
    },
  ],
  shippingAddress: {
    fullName: "Antonio Colagreco",
    line1: "Via Roma 1",
    city: "Chieti",
    postalCode: "66100",
    country: "IT",
    phone: "+390871000000",
  },
  totalCents: 7500,
  currency: "EUR",
  status: "PENDING_PAYMENT",
  createdAt: "2026-10-09T08:00:00.000Z",
};
const address: AddressDto = {
  id: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y",
  fullName: "Antonio Colagreco",
  line1: "Via Roma 1",
  city: "Chieti",
  postalCode: "66100",
  country: "IT",
  phone: "+390871000000",
  isDefault: true,
};

async function context(signedIn = true, withCart = true): Promise<RouterContextProvider> {
  const client: SessionClient = {
    getex: async () => null,
    set: async () => undefined,
    del: async () => undefined,
  };
  const sessions = createValkeySessionStorage(
    client,
    "a-test-secret-with-at-least-32-characters",
    false,
  );
  const state: RouterContextProvider = new RouterContextProvider();
  const session = await sessions.getSession();
  if (signedIn) {
    session.set("userId", "01JB2Q7Z8X4M3N5P6R7S8T9V0W");
    session.set("role", "customer");
    session.set("locale", "it");
  }
  if (withCart) session.set("cartId", "01JB2Q7Z8X4M3N5P6R7S8T9V0X");
  state.set(sessionContext, session);
  state.set(sessionStorageContext, sessions);
  return state;
}

function post(fields: Record<string, string>, origin = "http://web.test"): Request {
  return new Request("http://web.test/it/checkout", {
    method: "POST",
    headers: { origin, "x-actor": "forged" },
    body: new URLSearchParams(fields),
  });
}

describe("checkout actions", () => {
  it("requires authentication and same-origin requests before calling the API", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    await expect(
      checkoutAction(post({ intent: "order" }, "http://evil.test"), await context(), "it"),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      checkoutAction(post({ intent: "order" }), await context(false), "it"),
    ).rejects.toMatchObject({ status: 302 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects missing phone and retains the other address fields", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    const result = await checkoutAction(
      post({
        intent: "address",
        fullName: "Antonio Colagreco",
        line1: "Via Roma 1",
        city: "Chieti",
        postalCode: "66100",
        country: "IT",
        phone: "",
      }),
      await context(),
      "it",
    );
    if (result instanceof Response) expect.fail("Expected field errors");
    expect(result.init?.status).toBe(400);
    expect(result.data.errors.phone).toBe("addressFieldHint");
    expect(result.data.values.fullName).toBe("Antonio Colagreco");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("saves an address with normalized country and an omitted empty second line", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(address));
    const result = await checkoutAction(
      post({
        intent: "address",
        fullName: " Antonio Colagreco ",
        line1: "Via Roma 1",
        line2: "",
        city: "Chieti",
        postalCode: "66100",
        country: "it",
        phone: "+390871000000",
      }),
      await context(),
      "it",
    );
    if (!(result instanceof Response)) expect.fail("Expected redirect");
    expect(result.status).toBe(303);
    expect(result.headers.get("Location")).toBe("/it/checkout");
    const outgoing: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(await outgoing.json()).toEqual({
      fullName: "Antonio Colagreco",
      line1: "Via Roma 1",
      city: "Chieti",
      postalCode: "66100",
      country: "IT",
      phone: "+390871000000",
    });
  });
  it("takes the cart and actor from session and redirects to the backend checkout URL", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({ order, paymentUrl: "https://checkout.stripe.com/c/pay/test" }),
      );
    const result = await checkoutAction(
      post({
        intent: "order",
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y",
        cartId: "forged",
        totalCents: "1",
      }),
      await context(),
      "en",
    );
    if (!(result instanceof Response)) expect.fail("Expected redirect");
    expect(result.status).toBe(303);
    expect(result.headers.get("Location")).toBe("https://checkout.stripe.com/c/pay/test");
    const outgoing: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(await outgoing.json()).toEqual({
      cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
      addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y",
      locale: "en",
      ordersUrl: "http://web.test/en/orders",
    });
    expect(outgoing.headers.get("x-actor")).toBe(
      '{"userId":"01JB2Q7Z8X4M3N5P6R7S8T9V0W","role":"customer"}',
    );
  });
  it("redirects to the payment URL with a 303", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ order, paymentUrl: "https://checkout.stripe.com/c/pay/test" }),
    );
    const result = await checkoutAction(
      post({ intent: "order", addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y" }),
      await context(),
      "it",
    );
    if (!(result instanceof Response)) expect.fail("Expected redirect");
    expect(result.headers.get("Location")).toBe("https://checkout.stripe.com/c/pay/test");
  });

  it("builds the checkout return URL from the public HTTPS origin behind a proxy", async () => {
    vi.stubEnv("PUBLIC_ORIGIN", "https://shop.test");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({ order, paymentUrl: "https://checkout.stripe.com/c/pay/test" }),
      );
    await checkoutAction(
      post(
        {
          intent: "order",
          addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y",
          ordersUrl: "https://evil.test",
          locale: "en",
        },
        "https://shop.test",
      ),
      await context(),
      "it",
    );
    const outgoing: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(await outgoing.json()).toEqual({
      cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
      addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y",
      locale: "it",
      ordersUrl: "https://shop.test/it/orders",
    });
  });
  it("rejects missing session carts and missing selected addresses", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    const noCart = await checkoutAction(
      post({ intent: "order" }),
      await context(true, false),
      "it",
    );
    const noAddress = await checkoutAction(post({ intent: "order" }), await context(), "it");
    if (noCart instanceof Response || noAddress instanceof Response)
      expect.fail("Expected validation errors");
    expect(noCart.data.error).toBe("emptyCart");
    expect(noAddress.data.error).toBe("chooseAddress");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("maps declared placement errors to translated alerts", async () => {
    for (const [code, status, message] of [
      ["CART_NOT_FOUND", 404, "cartExpired"],
      ["CART_EMPTY", 422, "emptyCart"],
      ["ADDRESS_NOT_FOUND", 404, "addressMissing"],
      ["PRODUCT_UNAVAILABLE", 422, "unavailableCart"],
    ] as const) {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        Response.json({ defined: true, code, status, message: code }, { status }),
      );
      const result = await checkoutAction(
        post({ intent: "order", addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y" }),
        await context(),
        "it",
      );
      if (result instanceof Response) expect.fail("Expected error");
      expect(result.init?.status).toBe(status);
      expect(result.data.error).toBe(message);
    }
  });
});
