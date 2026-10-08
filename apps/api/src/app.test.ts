import { createLogger, Lifecycle } from "@arrosticini/ops";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

const logger = createLogger(
  { service: "api", version: "test", level: "silent", pretty: false },
  { write: () => {} },
);

describe("api", () => {
  it("answers /healthz with 200 and a request id", async () => {
    const response = await request(createApp(logger, new Lifecycle())).get("/healthz");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
  });

  it("answers 404 on unknown paths", async () => {
    const response = await request(createApp(logger, new Lifecycle())).get("/unknown");

    expect(response.status).toBe(404);
  });
});
