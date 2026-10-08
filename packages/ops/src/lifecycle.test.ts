import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { healthz, Lifecycle } from "./lifecycle.js";

describe("healthz", () => {
  it("returns 200 while running", async () => {
    const lifecycle = new Lifecycle();

    const response = await request(createServer(healthz(lifecycle))).get("/healthz");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns 503 during shutdown", async () => {
    const lifecycle = new Lifecycle();
    await lifecycle.shutdown(createServer().listen(0));

    const response = await request(createServer(healthz(lifecycle))).get("/healthz");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "shutting-down" });
  });
});

describe("Lifecycle.shutdown", () => {
  it("waits for in-flight requests, then runs the shutdown tasks", async () => {
    const events: string[] = [];
    const lifecycle = new Lifecycle();
    lifecycle.onShutdown(async () => {
      events.push("task");
    });
    let finishRequest = () => {};
    const server = createServer((_req, res) => {
      finishRequest = () => {
        events.push("response");
        res.end("done");
      };
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    let markArrived = () => {};
    const arrived = new Promise<void>((resolve) => {
      markArrived = resolve;
    });
    server.once("request", () => markArrived());

    const inFlight = fetch(`http://127.0.0.1:${port}/slow`).then((response) => response.text());
    await arrived;
    const shutdown = lifecycle.shutdown(server);
    finishRequest();

    expect(await inFlight).toBe("done");
    await shutdown;
    expect(events).toEqual(["response", "task"]);
    expect(server.listening).toBe(false);
  });
});
