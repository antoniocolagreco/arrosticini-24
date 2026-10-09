import type { UserDto } from "@arrosticini/contracts";
import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { accountAction } from "./account.server.js";
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

const mario: UserDto = {
  id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
  email: "mario.rossi@example.com",
  role: "customer",
  status: "ACTIVE",
  firstName: "Mario",
  lastName: "Bianchi",
  preferredLocale: "en",
  createdAt: "2026-10-08T10:00:00.000Z",
};

async function context(signedIn = true) {
  const stored: string[] = [];
  const client: SessionClient = {
    getex: async () => null,
    set: async (_key, value) => {
      stored.push(value);
    },
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
  state.set(sessionStorageContext, sessions);
  state.set(sessionContext, session);
  return { state, stored };
}

function post(fields: Record<string, string>, origin = "http://web.test"): Request {
  return new Request("http://web.test/it/account", {
    method: "POST",
    headers: { origin, "x-actor": "forged" },
    body: new URLSearchParams(fields),
  });
}

describe("account actions", () => {
  it("requires authentication and same-origin requests before calling Identity", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    const fields = { intent: "profile", firstName: "Mario", lastName: "Rossi" };
    await expect(
      accountAction(post(fields, "http://evil.test"), (await context()).state, "it"),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      accountAction(post(fields), (await context(false)).state, "it"),
    ).rejects.toMatchObject({ status: 302 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updates the profile and stores the new language in the session", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(mario));
    const { state, stored } = await context();
    const result = await accountAction(
      post({
        intent: "profile",
        firstName: " Mario ",
        lastName: "Bianchi",
        preferredLocale: "en",
        role: "admin",
      }),
      state,
      "it",
    );
    if (!(result instanceof Response)) expect.fail("Expected redirect");
    expect(result.status).toBe(303);
    expect(result.headers.get("Location")).toBe("/it/account?saved=profile");
    expect(result.headers.get("Set-Cookie")).toMatch(/^__session=/);
    const outgoing: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(outgoing.method).toBe("PATCH");
    expect(new URL(outgoing.url).pathname).toBe("/identity/me");
    expect(await outgoing.json()).toEqual({
      firstName: "Mario",
      lastName: "Bianchi",
      preferredLocale: "en",
    });
    expect(outgoing.headers.get("x-actor")).toBe(
      '{"userId":"01JB2Q7Z8X4M3N5P6R7S8T9V0W","role":"customer"}',
    );
    expect(JSON.parse(stored.at(-1) ?? "{}")).toMatchObject({ locale: "en" });
  });

  it("changes the password", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await accountAction(
      post({
        intent: "password",
        currentPassword: "arrosticini-24",
        newPassword: "pecora-in-overdrive",
      }),
      (await context()).state,
      "en",
    );
    if (!(result instanceof Response)) expect.fail("Expected redirect");
    expect(result.status).toBe(303);
    expect(result.headers.get("Location")).toBe("/en/account?saved=password");
    const outgoing: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(outgoing.method).toBe("POST");
    expect(new URL(outgoing.url).pathname).toBe("/identity/me/password");
    expect(await outgoing.json()).toEqual({
      currentPassword: "arrosticini-24",
      newPassword: "pecora-in-overdrive",
    });
  });

  it("returns field errors without calling Identity", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    const profile = await accountAction(
      post({ intent: "profile", firstName: " ", lastName: "Rossi", preferredLocale: "fr" }),
      (await context()).state,
      "it",
    );
    if (profile instanceof Response) expect.fail("Expected field errors");
    expect(profile.init?.status).toBe(400);
    expect(profile.data.errors).toEqual({
      firstName: "firstNameHint",
      preferredLocale: "chooseLocale",
    });
    expect(profile.data.values.lastName).toBe("Rossi");
    const password = await accountAction(
      post({ intent: "password", currentPassword: "", newPassword: "corta" }),
      (await context()).state,
      "it",
    );
    if (password instanceof Response) expect.fail("Expected field errors");
    expect(password.data.errors).toEqual({
      currentPassword: "passwordRequired",
      newPassword: "passwordHint",
    });
    const unknown = await accountAction(post({ intent: "email" }), (await context()).state, "it");
    if (unknown instanceof Response) expect.fail("Expected an error");
    expect(unknown.data.error).toBe("invalidForm");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("flags a wrong current password on its field", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json(
        {
          defined: true,
          code: "INVALID_CURRENT_PASSWORD",
          status: 422,
          message: "INVALID_CURRENT_PASSWORD",
        },
        { status: 422 },
      ),
    );
    const result = await accountAction(
      post({
        intent: "password",
        currentPassword: "wrong-password",
        newPassword: "pecora-in-overdrive",
      }),
      (await context()).state,
      "it",
    );
    if (result instanceof Response) expect.fail("Expected error");
    expect(result.init?.status).toBe(422);
    expect(result.data.errors).toEqual({ currentPassword: "wrongCurrentPassword" });
  });
});
