import type { Server } from "node:http";
import { createLogger, Lifecycle } from "@arrosticini/ops";
import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("web health", () => {
  const logger = createLogger({ service: "web", version: "test", level: "silent", pretty: false });

  it("returns process health and a correlation id", async () => {
    const lifecycle: Lifecycle = new Lifecycle();
    const app: Express = createApp(logger, lifecycle);
    const response = await request(app).get("/healthz").set("x-request-id", "web-health-test");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-request-id"]).toBe("web-health-test");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("compresses text responses for clients that accept it", async () => {
    const app: Express = createApp(logger, new Lifecycle());
    app.get("/page", (_req, res) => {
      res.type("html").send(`<p>${"arrosticini ".repeat(500)}</p>`);
    });
    const compressed = await request(app).get("/page").set("Accept-Encoding", "gzip");
    const plain = await request(app).get("/page").set("Accept-Encoding", "identity");
    expect(compressed.headers["content-encoding"]).toBe("gzip");
    expect(compressed.text).toBe(`<p>${"arrosticini ".repeat(500)}</p>`);
    expect(plain.headers["content-encoding"]).toBeUndefined();
  });

  it("returns 503 when shutdown has started", async () => {
    const lifecycle: Lifecycle = new Lifecycle();
    const app: Express = createApp(logger, lifecycle);
    const server: Server = app.listen(0);
    await lifecycle.shutdown(server);
    const response = await request(app).get("/healthz");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "shutting-down" });
  });
});
