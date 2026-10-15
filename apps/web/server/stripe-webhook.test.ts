import { createLogger, Lifecycle } from "@arrosticini/ops";
import type { Express } from "express";
import request from "supertest";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { createApp } from "./app.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Stripe webhook forwarding", () => {
  const logger = createLogger({ service: "web", version: "test", level: "silent", pretty: false });
  const payload: string = '{\n  "id": "evt_test", "text": "caffè", "data": {"amount": 7500}\n}\n';

  it("preserves signed bytes and trusted headers without forwarding browser credentials", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ received: true }));
    const app: Express = createApp(logger, new Lifecycle());
    const response = await request(app)
      .post("/webhooks/stripe")
      .set("content-type", "application/json")
      .set("stripe-signature", "t=123,v1=signed")
      .set("x-request-id", "webhook-test")
      .set("x-actor", "forged")
      .set("cookie", "__session=forged")
      .send(payload);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("http://api.test/payments/webhooks/stripe");
    expect(options?.headers).toEqual({
      "content-type": "application/json",
      "stripe-signature": "t=123,v1=signed",
      "x-request-id": "webhook-test",
    });
    expect(Buffer.from(options?.body as Uint8Array).toString()).toBe(payload);
    expect(options?.redirect).toBe("manual");
  });

  it.each([400, 500])(
    "preserves API status %i so Stripe rejects or retries the event",
    async (status) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json({ error: "WEBHOOK_ERROR" }, { status }),
      );
      const response = await request(createApp(logger, new Lifecycle()))
        .post("/webhooks/stripe")
        .set("content-type", "application/json")
        .send(payload);
      expect(response.status).toBe(status);
      expect(response.body).toEqual({ error: "WEBHOOK_ERROR" });
    },
  );

  it("does not parse malformed JSON before signature verification", async () => {
    const fetchMock: MockInstance<typeof fetch> = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ error: "INVALID_WEBHOOK_SIGNATURE" }, { status: 400 }));
    const response = await request(createApp(logger, new Lifecycle()))
      .post("/webhooks/stripe")
      .set("content-type", "application/json")
      .send("{not-json");
    expect(response.status).toBe(400);
    expect(Buffer.from(fetchMock.mock.calls[0]?.[1]?.body as Uint8Array).toString()).toBe(
      "{not-json",
    );
  });
});
