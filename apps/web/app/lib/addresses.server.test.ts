import type { AddressDto } from "@arrosticini/contracts";
import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { addressesAction } from "./addresses.server.js";
import {
  createValkeySessionStorage,
  type SessionClient,
  sessionContext,
} from "./session.server.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const address: AddressDto = {
  id: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y",
  fullName: "Lucia Bianchi",
  line1: "Torstraße 101",
  city: "Berlin",
  postalCode: "10119",
  country: "DE",
  phone: "+49 30 1234567",
  isDefault: false,
};

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
  return new Request("http://web.test/it/account/addresses", {
    method: "POST",
    headers: { origin, "x-actor": "forged" },
    body: new URLSearchParams(fields),
  });
}

describe("address book actions", () => {
  it("requires authentication and same-origin requests before calling Identity", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    await expect(
      addressesAction(
        post({ intent: "delete", id: address.id }, "http://evil.test"),
        await context(),
        "it",
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      addressesAction(post({ intent: "delete", id: address.id }), await context(false), "it"),
    ).rejects.toMatchObject({ status: 302 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updates every field, clears an empty second line and normalizes the country", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(address));
    const result = await addressesAction(
      post({
        intent: "update",
        id: address.id,
        fullName: " Lucia Bianchi ",
        line1: "Torstraße 101",
        line2: "",
        city: "Berlin",
        postalCode: "10119",
        country: "de",
        phone: "+49 30 1234567",
        isDefault: "true",
      }),
      await context(),
      "it",
    );
    if (!(result instanceof Response)) expect.fail("Expected redirect");
    expect(result.status).toBe(303);
    expect(result.headers.get("Location")).toBe("/it/account/addresses");
    const outgoing: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(outgoing.method).toBe("PATCH");
    expect(new URL(outgoing.url).pathname).toBe(`/identity/me/addresses/${address.id}`);
    expect(await outgoing.json()).toEqual({
      fullName: "Lucia Bianchi",
      line1: "Torstraße 101",
      line2: null,
      city: "Berlin",
      postalCode: "10119",
      country: "DE",
      phone: "+49 30 1234567",
    });
    expect(outgoing.headers.get("x-actor")).toBe(
      '{"userId":"01JB2Q7Z8X4M3N5P6R7S8T9V0W","role":"customer"}',
    );
  });

  it("makes an address the default without sending its fields", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ ...address, isDefault: true }));
    const result = await addressesAction(
      post({ intent: "default", id: address.id, fullName: "Forged" }),
      await context(),
      "en",
    );
    if (!(result instanceof Response)) expect.fail("Expected redirect");
    expect(result.headers.get("Location")).toBe("/en/account/addresses");
    const outgoing: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(outgoing.method).toBe("PATCH");
    expect(await outgoing.json()).toEqual({ isDefault: true });
  });

  it("removes an address by id", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await addressesAction(
      post({ intent: "delete", id: address.id }),
      await context(),
      "it",
    );
    if (!(result instanceof Response)) expect.fail("Expected redirect");
    expect(result.status).toBe(303);
    const outgoing: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(outgoing.method).toBe("DELETE");
    expect(new URL(outgoing.url).pathname).toBe(`/identity/me/addresses/${address.id}`);
  });

  it("rejects unknown intents and malformed ids without calling Identity", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    const attempts: Record<string, string>[] = [
      { intent: "archive", id: address.id },
      { intent: "delete", id: "not-an-id" },
      { intent: "default" },
      {
        intent: "update",
        id: "not-an-id",
        fullName: "Lucia Bianchi",
        line1: "Torstraße 101",
        city: "Berlin",
        postalCode: "10119",
        country: "DE",
        phone: "+49 30 1234567",
      },
    ];
    for (const fields of attempts) {
      const result = await addressesAction(post(fields), await context(), "it");
      if (result instanceof Response) expect.fail("Expected an error");
      expect(result.init?.status).toBe(400);
      expect(result.data.error).toBe("invalidAddress");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns field errors and keeps the values the customer typed", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    const result = await addressesAction(
      post({
        intent: "add",
        fullName: "Anna Verdi",
        line1: "Via del Corso 1",
        city: "Roma",
        postalCode: "00186",
        country: "Italia",
        phone: " ",
      }),
      await context(),
      "it",
    );
    if (result instanceof Response) expect.fail("Expected field errors");
    expect(result.init?.status).toBe(400);
    expect(result.data.errors).toEqual({ country: "chooseCountry", phone: "addressFieldHint" });
    expect(result.data.values.fullName).toBe("Anna Verdi");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps declared Identity errors to translated alerts", async () => {
    for (const [code, status, message, fields] of [
      ["ADDRESS_NOT_FOUND", 404, "addressMissing", { intent: "delete", id: address.id }],
      [
        "ADDRESS_LIMIT_REACHED",
        409,
        "addressLimit",
        {
          intent: "add",
          fullName: "Anna Verdi",
          line1: "Via del Corso 1",
          city: "Roma",
          postalCode: "00186",
          country: "IT",
          phone: "+39 06 1234567",
        },
      ],
    ] as const) {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        Response.json({ defined: true, code, status, message: code }, { status }),
      );
      const result = await addressesAction(post(fields), await context(), "it");
      if (result instanceof Response) expect.fail("Expected error");
      expect(result.init?.status).toBe(status);
      expect(result.data.error).toBe(message);
    }
  });
});
