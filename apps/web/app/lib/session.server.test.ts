import type { UserDto } from "@arrosticini/contracts";
import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertSameOrigin,
  createValkeySessionStorage,
  loginSession,
  requireUser,
  SESSION_TTL,
  type SessionClient,
  sessionContext,
  sessionStorageContext,
} from "./session.server.js";

afterEach(() => vi.unstubAllEnvs());

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
