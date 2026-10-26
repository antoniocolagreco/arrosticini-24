import { hash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import express, { type RequestHandler } from "express";

export async function serveStaticFiles(root: string): Promise<RequestHandler> {
  const etags: Map<string, string> = new Map();
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const filePath: string = path.join(entry.parentPath, entry.name);
    etags.set(filePath, `"${hash("sha1", await readFile(filePath), "base64url")}"`);
  }
  return express.static(root, {
    maxAge: "1h",
    setHeaders: (res, filePath: string) => {
      const etag: string | undefined = etags.get(filePath);
      if (etag) res.setHeader("ETag", etag);
    },
  });
}
