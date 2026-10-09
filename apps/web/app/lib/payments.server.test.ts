import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { paymentMethodsAction } from "./payments.server.js";
import {
  createValkeySessionStorage,
  type SessionClient,
  sessionContext,
} from "./session.server.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function context(signedIn = true): Promise<RouterContextProvider> {
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
  state.set(sessionContext, session);
  return state;
}

function post(fields: Record<string, string>, origin = "http://web.test"): Request {
  return new Request("http://web.test/it/account/payment-methods", {
    method: "POST",
    headers: { origin, "x-actor": "forged" },
    body: new URLSearchParams(fields),
  });
}

describe("saved card actions", () => {
  it("requires authentication and same-origin requests before contacting Payments", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    await expect(
      paymentMethodsAction(post({ intent: "setup" }, "http://evil.test"), await context(), "it"),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      paymentMethodsAction(post({ intent: "setup" }), await context(false), "it"),
    ).rejects.toMatchObject({ status: 302 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds the Stripe return URL and actor from trusted server data", async () => {
    vi.stubEnv("PUBLIC_ORIGIN", "https://shop.example");
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({ url: "https://checkout.stripe.com/setup/test" }, { status: 201 }),
      );
    const result = await paymentMethodsAction(
      post(
        { intent: "setup", returnUrl: "https://evil.test", userId: "forged" },
        "https://shop.example",
      ),
      await context(),
      "en",
    );
    expect(result).toMatchObject({ status: 303 });
    expect((result as Response).headers.get("Location")).toBe(
      "https://checkout.stripe.com/setup/test",
    );
    const sent: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(await sent.json()).toEqual({
      returnUrl: "https://shop.example/en/account/payment-methods",
      locale: "en",
    });
    expect(JSON.parse(sent.headers.get("x-actor") ?? "{}")).toEqual({
      userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
      role: "customer",
    });
  });

  it.each([
    { intent: "delete", id: "" },
    { intent: "unknown", id: "pm_test" },
  ])("rejects invalid card actions without calling the API", async (fields) => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    const result = await paymentMethodsAction(post(fields), await context(), "it");
    expect(result).toMatchObject({
      data: { error: "invalidPaymentMethod" },
      init: { status: 400 },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deletes a saved card with the session actor", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const result = await paymentMethodsAction(
      post({ intent: "delete", id: "pm_test" }),
      await context(),
      "it",
    );
    expect(result).toMatchObject({ data: { error: null } });
    const sent: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(sent.method).toBe("DELETE");
    expect(sent.url).toContain("/payments/methods/pm_test");
  });

  it("reports another customer's card as missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { defined: true, code: "PAYMENT_METHOD_NOT_FOUND", status: 404, message: "not found" },
        { status: 404 },
      ),
    );
    const result = await paymentMethodsAction(
      post({ intent: "delete", id: "pm_other" }),
      await context(),
      "it",
    );
    expect(result).toMatchObject({
      data: { error: "paymentMethodMissing" },
      init: { status: 404 },
    });
  });
});
