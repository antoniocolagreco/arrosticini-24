import type { CartDto, UserDto } from "@arrosticini/contracts";
import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { middleware as localeMiddleware } from "../routes/locale.js";
import { api } from "./api.server.js";
import { authenticate } from "./auth.server.js";
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

async function context() {
  const client: SessionClient = {
    getex: async () => null,
    set: vi.fn<SessionClient["set"]>(async () => undefined),
    del: async () => undefined,
  };
  const sessions = createValkeySessionStorage(
    client,
    "a-test-secret-with-at-least-32-characters",
    false,
  );
  const context: RouterContextProvider = new RouterContextProvider();
  context.set(sessionStorageContext, sessions);
  context.set(sessionContext, await sessions.getSession());
  return context;
}

function post(fields: Record<string, string>): Request {
  return new Request("http://web.test/it/login", {
    method: "POST",
    headers: {
      origin: "http://web.test",
      "x-request-id": "auth-request",
      "x-actor": '{"userId":"forged","role":"admin"}',
    },
    body: new URLSearchParams(fields),
  });
}

const user: UserDto = {
  id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
  email: "antonio@example.com",
  firstName: "Antonio",
  lastName: "Colagreco",
  role: "customer",
  preferredLocale: "it",
  createdAt: "2026-10-09T00:00:00.000Z",
};

const cart: CartDto = {
  id: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
  lines: [],
  updatedAt: "2026-10-09T00:00:00.000Z",
};

describe("authentication actions", () => {
  it("requires both names before registering and keeps entered values without the password", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    const result = await authenticate(
      post({
        email: "antonio@example.com",
        password: "long-password",
        firstName: "",
        lastName: " ",
      }),
      await context(),
      "it",
      true,
    );
    if (result instanceof Response) expect.fail("Expected validation errors");
    expect(result.data.errors).toEqual({ firstName: "firstNameHint", lastName: "lastNameHint" });
    expect(result.data.values).toEqual({
      email: "antonio@example.com",
      firstName: "",
      lastName: " ",
    });
    expect(JSON.stringify(result.data)).not.toContain("long-password");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("signs in with only a normalized email and password", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(user))
      .mockResolvedValueOnce(Response.json(cart))
      .mockResolvedValueOnce(Response.json(cart));
    const result = await authenticate(
      post({ email: " Antonio@Example.com ", password: "long-password" }),
      await context(),
      "it",
      false,
    );
    if (!(result instanceof Response)) expect.fail("Expected redirect");
    expect(result.status).toBe(303);
    const outbound: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(await outbound.json()).toEqual({
      email: "antonio@example.com",
      password: "long-password",
    });
  });
  it("signs in an admin without taking the visitor cart", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          id: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y",
          email: "admin@example.com",
          firstName: "Admin",
          lastName: "Arrosticini 24ore",
          role: "admin",
          preferredLocale: "it",
          createdAt: "2026-10-09T00:00:00.000Z",
        }),
      );
    const state = await context();
    state.get(sessionContext).set("cartId", "01JB2Q7Z8X4M3N5P6R7S8T9V0X");
    const result = await authenticate(
      post({ email: "admin@example.com", password: "long-password" }),
      state,
      "it",
      false,
    );
    if (!(result instanceof Response)) expect.fail("Expected redirect");
    expect(result.status).toBe(303);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects unsupported language paths before executing an action", async () => {
    const next = vi.fn(async () => new Response(null));
    await expect(
      localeMiddleware[0]?.(
        {
          request: post({ email: "antonio@example.com", password: "long-password" }),
          params: { lang: "xx" },
          context: await context(),
          url: new URL("http://web.test/xx/login"),
          pattern: "/:lang",
        },
        next,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(next).not.toHaveBeenCalled();
  });
  it("validates registration before calling the API and never returns a password", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    const result = await authenticate(
      post({ email: "a", password: "short", firstName: "Antonio", lastName: "Colagreco" }),
      await context(),
      "it",
      true,
    );
    if (result instanceof Response) expect.fail("Expected validation errors");
    expect(result.init?.status).toBe(400);
    expect(result.data.errors).toEqual({ email: "emailHint", password: "passwordHint" });
    expect(JSON.stringify(result.data)).not.toContain("short");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("registers with the page locale and returns a signed session redirect", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(user))
      .mockResolvedValueOnce(Response.json(cart))
      .mockResolvedValueOnce(Response.json(cart));
    const result = await authenticate(
      post({
        email: " Antonio@Example.com ",
        password: "long-password",
        firstName: " Antonio ",
        lastName: " Colagreco ",
      }),
      await context(),
      "en",
      true,
    );
    if (!(result instanceof Response)) expect.fail("Expected redirect");
    expect(result.status).toBe(303);
    expect(result.headers.get("Location")).toBe("/en/account");
    expect(result.headers.get("Set-Cookie")).toContain("__session=");
    const outbound: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(await outbound.json()).toEqual({
      email: "antonio@example.com",
      firstName: "Antonio",
      lastName: "Colagreco",
      password: "long-password",
      preferredLocale: "en",
    });
    expect(outbound.headers.get("x-request-id")).toBe("auth-request");
    expect(outbound.headers.has("x-actor")).toBe(false);
    expect(outbound.headers.has("cookie")).toBe(false);
  });

  it("returns invalid credentials as a form alert without echoing the password", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { defined: true, code: "INVALID_CREDENTIALS", status: 401, message: "Invalid credentials" },
        { status: 401 },
      ),
    );
    const result = await authenticate(
      post({ email: "antonio@example.com", password: "wrong-password" }),
      await context(),
      "it",
      false,
    );
    if (result instanceof Response) expect.fail("Expected form error");
    expect(result.init?.status).toBe(401);
    expect(result.data.error).toBe("invalidCredentials");
    expect(JSON.stringify(result.data)).not.toContain("wrong-password");
  });

  it("returns a duplicate email on the field that needs changing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { defined: true, code: "EMAIL_TAKEN", status: 409, message: "Taken" },
        { status: 409 },
      ),
    );
    const result = await authenticate(
      post({
        email: "antonio@example.com",
        password: "long-password",
        firstName: "Antonio",
        lastName: "Colagreco",
      }),
      await context(),
      "it",
      true,
    );
    if (result instanceof Response) expect.fail("Expected field error");
    expect(result.init?.status).toBe(409);
    expect(result.data.errors.email).toBe("emailTaken");
  });

  it("lets unexpected API failures reach the shared error boundary", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { code: "INTERNAL_SERVER_ERROR", status: 500, message: "Failed" },
        { status: 500 },
      ),
    );
    await expect(
      authenticate(
        post({ email: "antonio@example.com", password: "long-password" }),
        await context(),
        "it",
        false,
      ),
    ).rejects.toThrow();
  });

  it("forwards only the actor explicitly supplied from the server session", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(user));
    await api(post({ email: "antonio@example.com", password: "unused" }), {
      userId: user.id,
      role: "customer",
    }).identity.getMe();
    const outbound: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(outbound.headers.get("x-actor")).toBe(
      JSON.stringify({ userId: user.id, role: "customer" }),
    );
    expect(outbound.headers.has("cookie")).toBe(false);
  });
});
