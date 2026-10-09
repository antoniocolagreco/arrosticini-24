import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import {
  createValkeySessionStorage,
  type SessionClient,
  sessionContext,
} from "./session.server.js";
import { userAdminAction } from "./users-admin.server.js";

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

function post(intent: string, origin = "http://web.test"): Request {
  return new Request("http://web.test/it/admin/users/01JB2Q7Z8X4M3N5P6R7S8T9V0X", {
    method: "POST",
    headers: { origin, "x-actor": "forged" },
    body: new URLSearchParams({ intent }),
  });
}

const paola = {
  id: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
  email: "paola.marini@example.com",
  role: "customer",
  status: "SUSPENDED",
  firstName: "Paola",
  lastName: "Marini",
  preferredLocale: "it",
  createdAt: "2026-10-09T10:00:00.000Z",
};

describe("user administration", () => {
  it("requires a same-origin admin request before calling Identity", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");

    await expect(
      userAdminAction(
        post("suspend", "http://evil.test"),
        await context(),
        "it",
        "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      userAdminAction(
        post("suspend"),
        await context("customer"),
        "it",
        "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("suspends a user and redirects to the card", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(paola));

    const result = await userAdminAction(
      post("suspend"),
      await context(),
      "it",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
    );

    if (!(result instanceof Response)) expect.fail("Expected redirect");
    expect(result.status).toBe(303);
    expect(result.headers.get("Location")).toBe(
      "/it/admin/users/01JB2Q7Z8X4M3N5P6R7S8T9V0X?saved=suspended",
    );
    const outgoing: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(outgoing.method).toBe("PATCH");
    expect(new URL(outgoing.url).pathname).toBe("/identity/admin/users/01JB2Q7Z8X4M3N5P6R7S8T9V0X");
    expect(await outgoing.json()).toEqual({ status: "SUSPENDED" });
    expect(outgoing.headers.get("x-actor")).toBe(
      '{"userId":"01JB2Q7Z8X4M3N5P6R7S8T9V0W","role":"admin"}',
    );
  });

  it("reports an admin account that cannot be suspended", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json(
        {
          defined: true,
          code: "USER_NOT_SUSPENDABLE",
          status: 409,
          message: "USER_NOT_SUSPENDABLE",
        },
        { status: 409 },
      ),
    );

    const result = await userAdminAction(
      post("suspend"),
      await context(),
      "en",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
    );

    if (result instanceof Response) expect.fail("Expected an error");
    expect(result.init?.status).toBe(409);
    expect(result.data.error).toBe("userNotSuspendable");
  });

  it("rejects an unknown intent or user id without calling Identity", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");

    const intent = await userAdminAction(
      post("delete"),
      await context(),
      "it",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
    );
    const id = await userAdminAction(post("suspend"), await context(), "it", "not-an-id");

    for (const result of [intent, id]) {
      if (result instanceof Response) expect.fail("Expected an error");
      expect(result.data.error).toBe("invalidForm");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
