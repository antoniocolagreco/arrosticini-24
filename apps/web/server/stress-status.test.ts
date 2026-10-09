import type { WhoAmI } from "@arrosticini/ops";
import { createLogger, Lifecycle } from "@arrosticini/ops";
import type { Express } from "express";
import request from "supertest";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { createApp } from "./app.js";
import { createStressStatus } from "./stress-status.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("stress status", () => {
  const web: WhoAmI = {
    service: "web",
    version: "v2",
    taskId: "web-1",
    availabilityZone: "eu-south-1a",
    cpuPercent: 42,
    startedAt: "2026-10-09T12:00:00Z",
  };
  const api: WhoAmI = {
    service: "api",
    version: "v1",
    taskId: "api-1",
    availabilityZone: "eu-south-1b",
    cpuPercent: 81,
    startedAt: "2026-10-09T11:00:00Z",
  };
  const logger = createLogger({ service: "web", version: "test", level: "silent", pretty: false });
  function app(): Express {
    const application: Express = createApp(logger, new Lifecycle());
    application.get(
      "/stress/status",
      createStressStatus(() => web),
    );
    return application;
  }

  it("returns independent web and API readings without sessions or cached responses", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(api));
    const response = await request(app())
      .get("/stress/status")
      .set("x-request-id", "stress-test")
      .set("cookie", "__session=forged")
      .set("x-actor", "forged");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ web, api });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["set-cookie"]).toBeUndefined();
    const forwarded: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(forwarded.url).toBe("http://api.test/internal/whoami");
    expect(forwarded.headers.get("x-request-id")).toBe("stress-test");
    expect(forwarded.headers.has("cookie")).toBe(false);
    expect(forwarded.headers.has("x-actor")).toBe(false);
    expect(forwarded.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([503, 404])("keeps web visible when API returns %i", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "UNAVAILABLE" }, { status }),
    );
    const response = await request(app()).get("/stress/status");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ web, api: null });
  });

  it("keeps web visible when the API connection fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Connection refused"));
    expect((await request(app()).get("/stress/status")).body).toEqual({ web, api: null });
  });

  it("times out a stalled API without losing the web reading", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (input) =>
        new Promise((_resolve, reject) => {
          const forwarded: Request = input as Request;
          forwarded.signal.addEventListener("abort", () => reject(forwarded.signal.reason), {
            once: true,
          });
        }),
    );
    const start: number = performance.now();
    const response = await request(app()).get("/stress/status");
    expect(response.body).toEqual({ web, api: null });
    expect(performance.now() - start).toBeLessThan(2000);
  });

  it("rejects malformed readings instead of displaying invalid CPU values", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        service: "api",
        version: "v1",
        taskId: "api-1",
        availabilityZone: "local",
        cpuPercent: 101,
        startedAt: "2026-10-09T12:00:00Z",
      }),
    );
    expect((await request(app()).get("/stress/status")).body).toEqual({ web, api: null });
  });
});
