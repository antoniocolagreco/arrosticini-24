import { createServer } from "node:http";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createHttpLogger, REQUEST_ID_HEADER } from "./http-logger.js";
import { createLogger } from "./logger.js";

function setup(status: number) {
  const lines: Record<string, unknown>[] = [];
  const logger = createLogger(
    { service: "api", version: "v1.0.0", level: "info", pretty: false },
    { write: (line: string) => lines.push(JSON.parse(line)) },
  );
  const httpLogger = createHttpLogger(logger);
  const server = createServer((req, res) => {
    httpLogger(req, res);
    res.statusCode = status;
    res.end();
  });
  return { server, lines };
}

describe("createHttpLogger", () => {
  it("generates a request id and returns it in the response", async () => {
    const { server, lines } = setup(200);

    const response = await request(server).get("/catalog/products?q=vino");

    const requestId = response.headers[REQUEST_ID_HEADER];
    expect(requestId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(lines).toEqual([
      expect.objectContaining({
        level: 30,
        service: "api",
        version: "v1.0.0",
        requestId,
        req: { method: "GET", path: "/catalog/products" },
        res: { status: 200 },
        responseTime: expect.any(Number),
      }),
    ]);
  });

  it("reuses an incoming request id", async () => {
    const { server, lines } = setup(200);

    const response = await request(server).get("/").set(REQUEST_ID_HEADER, "01JABCDEF");

    expect(response.headers[REQUEST_ID_HEADER]).toBe("01JABCDEF");
    expect(lines[0]).toEqual(expect.objectContaining({ requestId: "01JABCDEF" }));
  });

  it.each([
    [404, 40],
    [500, 50],
  ])("logs status %i with level %i", async (status, level) => {
    const { server, lines } = setup(status);

    await request(server).get("/");

    expect(lines[0]).toEqual(expect.objectContaining({ level }));
  });
});
