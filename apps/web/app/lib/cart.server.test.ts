import type { CartDto } from "@arrosticini/contracts";
import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { cartProducts, changeCart, mergeOwnedCart, readCart } from "./cart.server.js";
import {
  createValkeySessionStorage,
  type SessionClient,
  sessionContext,
  sessionStorageContext,
} from "./session.server.js";

afterEach(() => vi.restoreAllMocks());

const empty: CartDto = {
  id: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
  lines: [],
  updatedAt: "2026-10-09T00:00:00.000Z",
};
const existing: CartDto = {
  id: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y",
  lines: [{ slug: "arrosticini-75", quantity: 3 }],
  updatedAt: "2026-10-09T00:00:00.000Z",
};
const merged: CartDto = {
  id: "01JB2Q7Z8X4M3N5P6R7S8T9V0Z",
  lines: [{ slug: "arrosticini-75", quantity: 4 }],
  updatedAt: "2026-10-09T00:00:00.000Z",
};

async function context(cartId?: string) {
  const records: Map<string, string> = new Map();
  const client: SessionClient = {
    getex: async (key: string) => records.get(key) ?? null,
    set: async (key: string, value: string) => {
      records.set(key, value);
    },
    del: async (key: string) => {
      records.delete(key);
    },
  };
  const sessions = createValkeySessionStorage(
    client,
    "a-test-secret-with-at-least-32-characters",
    false,
  );
  const context: RouterContextProvider = new RouterContextProvider();
  const session = await sessions.getSession();
  if (cartId) session.set("cartId", cartId);
  context.set(sessionStorageContext, sessions);
  context.set(sessionContext, session);
  return { context, sessions };
}

function post(fields: Record<string, string>, origin = "http://web.test"): Request {
  return new Request("http://web.test/it/cart", {
    method: "POST",
    headers: { origin },
    body: new URLSearchParams(fields),
  });
}

function missing(): Response {
  return Response.json(
    { defined: true, code: "CART_NOT_FOUND", status: 404, message: "Cart not found" },
    { status: 404 },
  );
}

describe("shopping cart", () => {
  it("does not create a cart for a visitor who has not added anything", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    expect(await readCart(new Request("http://web.test/it"), (await context()).context)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects foreign origins and invalid quantities before any API call", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    await expect(
      changeCart(
        post({ intent: "add", slug: "arrosticini-75", quantity: "1" }, "http://evil.test"),
        (await context()).context,
        "it",
      ),
    ).rejects.toMatchObject({ status: 403 });
    for (const quantity of ["", "1.5", "100", "-1", "0", " 1 "]) {
      const result = await changeCart(
        post({ intent: "add", slug: "arrosticini-75", quantity }),
        (await context()).context,
        "it",
      );
      expect(result.init?.status).toBe(400);
      expect(result.data.error).toBe("invalidQuantity");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates an anonymous cart on first add and keeps its id behind a signed cookie", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(empty))
      .mockResolvedValueOnce(Response.json(existing));
    const { context: state, sessions } = await context();
    const result = await changeCart(
      post({ intent: "add", slug: "arrosticini-75", quantity: "3", id: "forged" }),
      state,
      "it",
    );
    expect(result.data.ok).toBe(true);
    const outgoing: Request = fetchMock.mock.calls[1]?.[0] as Request;
    expect(outgoing.url).toContain(`/shopping/carts/${empty.id}/lines/arrosticini-75`);
    expect(await outgoing.json()).toEqual({ quantity: 3 });
    const cookie: string = result.init?.headers
      ? (new Headers(result.init.headers).get("Set-Cookie") ?? "")
      : "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).not.toContain(empty.id);
    const session = await sessions.getSession(cookie);
    expect(session.get("cartId")).toBe(empty.id);
    expect(session.has("userId")).toBe(false);
  });

  it("adds to the existing quantity rather than overwriting it", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(existing))
      .mockResolvedValueOnce(Response.json(merged));
    const result = await changeCart(
      post({ intent: "add", slug: "arrosticini-75", quantity: "1" }),
      (await context(existing.id)).context,
      "it",
    );
    expect(result.data.quantity).toBe(4);
    const outgoing: Request = fetchMock.mock.calls[1]?.[0] as Request;
    expect(await outgoing.json()).toEqual({ quantity: 4 });
  });

  it("rejects a sum over 99 without changing the cart", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(existing));
    const result = await changeCart(
      post({ intent: "add", slug: "arrosticini-75", quantity: "97" }),
      (await context(existing.id)).context,
      "it",
    );
    expect(result.init?.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("removes a line with quantity zero", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(existing))
      .mockResolvedValueOnce(Response.json(empty));
    const result = await changeCart(
      post({ intent: "set", slug: "arrosticini-75", quantity: "0" }),
      (await context(existing.id)).context,
      "it",
    );
    expect(result.data.ok).toBe(true);
    const outgoing: Request = fetchMock.mock.calls[1]?.[0] as Request;
    expect(await outgoing.json()).toEqual({ quantity: 0 });
  });

  it("recovers an expired anonymous cart on the next add", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(missing())
      .mockResolvedValueOnce(Response.json(empty))
      .mockResolvedValueOnce(Response.json(existing));
    const state = (await context(existing.id)).context;
    expect(
      (
        await changeCart(
          post({ intent: "add", slug: "arrosticini-75", quantity: "1" }),
          state,
          "it",
        )
      ).data.ok,
    ).toBe(true);
    expect(state.get(sessionContext).get("cartId")).toBe(empty.id);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("uses the returned user cart id and a trusted actor when merging", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(merged));
    expect(
      await mergeOwnedCart(
        new Request("http://web.test/it/login", { headers: { "x-actor": "forged" } }),
        { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0W", role: "customer" },
        existing.id,
      ),
    ).toEqual(merged);
    const request: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toContain(`/shopping/carts/${existing.id}/merge`);
    expect(request.headers.get("x-actor")).toBe(
      '{"userId":"01JB2Q7Z8X4M3N5P6R7S8T9V0W","role":"customer"}',
    );
  });

  it("recovers the owned cart even without an anonymous cart", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(empty))
      .mockResolvedValueOnce(Response.json(merged));
    expect(
      (
        await mergeOwnedCart(new Request("http://web.test"), {
          userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
          role: "customer",
        })
      ).id,
    ).toBe(merged.id);
    const outgoing: Request = fetchMock.mock.calls[1]?.[0] as Request;
    expect(outgoing.url).toContain(`/shopping/carts/${empty.id}/merge`);
  });

  it("keeps unavailable products removable and lets unexpected failures propagate", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json(
          { defined: true, code: "PRODUCT_NOT_FOUND", status: 404, message: "Not found" },
          { status: 404 },
        ),
      )
      .mockRejectedValueOnce(new Error("API offline"));
    expect(await cartProducts(new Request("http://web.test"), existing)).toEqual([
      { slug: "arrosticini-75", quantity: 3, product: null, image: undefined },
    ]);
    await expect(cartProducts(new Request("http://web.test"), existing)).rejects.toThrow();
  });
});
