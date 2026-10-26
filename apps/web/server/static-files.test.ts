import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express, { type Express } from "express";
import request, { type Response as TestResponse } from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { serveStaticFiles } from "./static-files.js";

describe("static files", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "web-static-"));
    await mkdir(path.join(root, "images"));
    await writeFile(path.join(root, "images/town.webp"), "town");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function serve(): Promise<Express> {
    const app: Express = express();
    app.use(await serveStaticFiles(root));
    return app;
  }

  it("derives the etag from the content, not from the build time", async () => {
    const first: TestResponse = await request(await serve()).get("/images/town.webp");
    await utimes(path.join(root, "images/town.webp"), new Date(), new Date(Date.now() + 60_000));
    const second: TestResponse = await request(await serve()).get("/images/town.webp");
    expect(first.status).toBe(200);
    expect(first.headers["cache-control"]).toBe("public, max-age=3600");
    expect(first.headers.etag).toBe('"DNCxkjHbmiuRXjfqLDZskCnNkCA"');
    expect(second.headers.etag).toBe(first.headers.etag);
  });

  it("answers 304 when the browser already has the same content", async () => {
    const response: TestResponse = await request(await serve())
      .get("/images/town.webp")
      .set("If-None-Match", '"DNCxkjHbmiuRXjfqLDZskCnNkCA"');
    expect(response.status).toBe(304);
  });

  it("changes the etag when the content changes", async () => {
    await writeFile(path.join(root, "images/town.webp"), "new town");
    const response: TestResponse = await request(await serve())
      .get("/images/town.webp")
      .set("If-None-Match", '"DNCxkjHbmiuRXjfqLDZskCnNkCA"');
    expect(response.status).toBe(200);
    expect(response.headers.etag).not.toBe('"DNCxkjHbmiuRXjfqLDZskCnNkCA"');
  });
});
