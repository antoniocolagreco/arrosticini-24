import { createLogger, Lifecycle } from "@arrosticini/ops";
import request from "supertest";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { createApp } from "./app.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("product images", () => {
  const logger = createLogger({ service: "web", version: "test", level: "silent", pretty: false });
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  it("serves the image from the API with a long cache and no session cookie", async () => {
    vi.stubEnv("API_URL", "http://api.test");
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(png, {
        headers: {
          "content-type": "image/png",
          "content-disposition": 'inline; filename="0192e1a0-0000-7000-8000-000000000012.png"',
        },
      }),
    );
    const response = await request(createApp(logger, new Lifecycle()))
      .get("/images/products/vino/0192e1a0-0000-7000-8000-000000000012.png")
      .set("x-request-id", "image-test")
      .set("x-actor", "forged")
      .set("cookie", "__session=forged");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(new Uint8Array(response.body as Buffer)).toEqual(png);
    const outbound: Request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(outbound.url).toBe(
      "http://api.test/catalog/products/vino/images/0192e1a0-0000-7000-8000-000000000012.png",
    );
    expect(outbound.headers.get("x-request-id")).toBe("image-test");
    expect(outbound.headers.has("x-actor")).toBe(false);
    expect(outbound.headers.has("cookie")).toBe(false);
  });

  it("answers 404 for an image the API does not have", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { code: "PRODUCT_IMAGE_NOT_FOUND", status: 404, message: "Missing image", defined: true },
        { status: 404 },
      ),
    );
    const response = await request(createApp(logger, new Lifecycle())).get(
      "/images/products/vino/0192e1a0-0000-7000-8000-000000000012.png",
    );

    expect(response.status).toBe(404);
  });

  it.each([
    "/images/products/vino/red.webp",
    "/images/products/Vino_Rosso/0192e1a0-0000-7000-8000-000000000012.png",
  ])("answers 404 for the malformed path %s without calling the API", async (path) => {
    const fetchMock: MockInstance<typeof fetch> = vi.spyOn(globalThis, "fetch");
    const response = await request(createApp(logger, new Lifecycle())).get(path);

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
