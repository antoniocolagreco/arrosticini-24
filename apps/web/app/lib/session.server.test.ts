import type { UserDto } from "@arrosticini/contracts";
import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api.server.js";
import {
  assertSameOrigin,
  createValkeySessionStorage,
  loginSession,
  requireUser,
  SESSION_TTL,
  type SessionClient,
  sessionContext,
  sessionMiddleware,
  sessionStorageContext,
} from "./session.server.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function store() {
  const records: Map<string, string> = new Map();
  const client: SessionClient = {
    getex: vi.fn<SessionClient["getex"]>(async (key) => records.get(key) ?? null),
    set: vi.fn<SessionClient["set"]>(async (key, value) => {
      records.set(key, value);
    }),
    del: vi.fn<SessionClient["del"]>(async (key) => {
      records.delete(key);
    }),
  };
  const sessions = createValkeySessionStorage(
    client,
    "a-test-secret-with-at-least-32-characters",
    true,
  );
  return { records, client, sessions };
}

const user: UserDto = {
  id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
  email: "antonio@example.com",
  firstName: "Antonio",
  lastName: "Colagreco",
  role: "customer",
  status: "ACTIVE",
  preferredLocale: "it",
  createdAt: "2026-10-09T00:00:00.000Z",
};

describe("Valkey sessions", () => {
  it("keeps identity on the server, signs an opaque cookie and renews the seven-day TTL", async () => {
    const { records, client, sessions } = store();
    const context: RouterContextProvider = new RouterContextProvider();
    context.set(sessionStorageContext, sessions);
    context.set(sessionContext, await sessions.getSession());
    const cookie: string = await loginSession(context, user);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain(`Max-Age=${SESSION_TTL}`);
    expect(cookie).not.toContain("antonio");
    expect(cookie).not.toContain(user.id);
    expect([...records.keys()][0]).toMatch(/^sess:[a-f0-9]{64}$/);
    expect(JSON.parse([...records.values()][0] ?? "null")).toEqual({
      userId: user.id,
      role: "customer",
      locale: "it",
    });
    const restored = await sessions.getSession(cookie);
    expect(restored.get("userId")).toBe(user.id);
    expect(client.getex).toHaveBeenCalledWith(`sess:${restored.id}`, "EX", SESSION_TTL);
    await sessions.destroySession(restored);
    expect((await sessions.getSession(cookie)).has("userId")).toBe(false);
  });

  it("rotates a previous session ID at login and invalidates the old cookie", async () => {
    const { sessions } = store();
    const context: RouterContextProvider = new RouterContextProvider();
    context.set(sessionStorageContext, sessions);
    context.set(sessionContext, await sessions.getSession());
    const previous: string = await loginSession(context, user);
    context.set(sessionContext, await sessions.getSession(previous));
    const current: string = await loginSession(context, user);
    expect(current).not.toBe(previous);
    expect((await sessions.getSession(previous)).has("userId")).toBe(false);
    expect((await sessions.getSession(current)).get("userId")).toBe(user.id);
  });

  it("rejects a forged signature and treats expired Valkey data as anonymous", async () => {
    const { records, sessions } = store();
    const context: RouterContextProvider = new RouterContextProvider();
    context.set(sessionStorageContext, sessions);
    context.set(sessionContext, await sessions.getSession());
    const cookie: string = await loginSession(context, user);
    expect(
      (await sessions.getSession(cookie.replace("__session=", "__session=forged"))).has("userId"),
    ).toBe(false);
    records.clear();
    expect((await sessions.getSession(cookie)).has("userId")).toBe(false);
  });

  it("redirects an anonymous visitor from the protected area", async () => {
    const { sessions } = store();
    const context: RouterContextProvider = new RouterContextProvider();
    context.set(sessionContext, await sessions.getSession());
    try {
      requireUser(context, "en");
      expect.fail("Expected redirect");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).headers.get("Location")).toBe("/en/login");
    }
  });
});

describe("rejected sessions", () => {
  async function signedIn() {
    const { records, sessions } = store();
    const context: RouterContextProvider = new RouterContextProvider();
    context.set(sessionStorageContext, sessions);
    context.set(sessionContext, await sessions.getSession());
    const cookie: string = await loginSession(context, user);
    const request: Request = new Request("http://web.test/en/orders", { headers: { cookie } });
    return { records, context, request };
  }

  async function run(
    request: Request,
    context: RouterContextProvider,
    next: () => Promise<Response>,
  ): Promise<Response> {
    const response = await sessionMiddleware(
      { request, context, params: { lang: "en" }, url: new URL(request.url), pattern: "/:lang" },
      next,
    );
    if (!(response instanceof Response)) throw new Error("Expected a response");
    return response;
  }

  it("signs out a user that the API no longer accepts", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json(
        { defined: false, code: "UNAUTHORIZED", status: 401, message: "Suspended" },
        { status: 401 },
      ),
    );
    const { records, context, request } = await signedIn();

    const outcome: unknown = await run(request, context, async () => {
      await api(request, { userId: user.id, role: "customer" })
        .identity.getMe()
        .catch(() => undefined);
      return new Response("error page", { status: 500 });
    }).catch((caught: unknown) => caught);

    if (!(outcome instanceof Response)) expect.fail("Expected redirect");
    expect(outcome.status).toBe(302);
    expect(outcome.headers.get("Location")).toBe("/en/login");
    expect(outcome.headers.get("Set-Cookie")).toContain("__session=;");
    expect(records.size).toBe(0);
  });

  it("keeps the session when the API accepts the user", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(user));
    const { records, context, request } = await signedIn();

    const response = await run(request, context, async () => {
      await api(request, { userId: user.id, role: "customer" }).identity.getMe();
      return new Response("account page");
    });

    expect(response.status).toBe(200);
    expect(records.size).toBe(1);
  });
});

describe("form origin", () => {
  it("rejects missing and foreign origins before processing credentials", () => {
    expect(() => assertSameOrigin(new Request("http://web.test/it/login"))).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("http://web.test/it/login", { headers: { origin: "http://evil.test" } }),
      ),
    ).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("http://web.test/it/login", { headers: { origin: "http://web.test" } }),
      ),
    ).not.toThrow();
  });
  it("uses the public HTTPS origin when web is behind the load balancer", () => {
    vi.stubEnv("PUBLIC_ORIGIN", "https://shop.test");
    expect(() =>
      assertSameOrigin(
        new Request("http://web:3100/it/login", { headers: { origin: "https://shop.test" } }),
      ),
    ).not.toThrow();
  });
});
