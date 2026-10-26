import type { ProductDto } from "@arrosticini/contracts";
import type { Request, Response } from "express";
import { api } from "../app/lib/api.server.js";
import { storefrontPaths } from "../app/lib/seo.js";
import { publicOrigin } from "../app/lib/seo.server.js";

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character: string) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character] ?? character;
  });
}

export function serveRobots(req: Request, res: Response): void {
  const origin: string = publicOrigin(`${req.protocol}://${req.get("host")}`);
  res
    .type("text/plain")
    .set("Cache-Control", "public, max-age=300")
    .send(`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
}

export async function serveSitemap(req: Request, res: Response): Promise<void> {
  const origin: string = publicOrigin(`${req.protocol}://${req.get("host")}`);
  const request: globalThis.Request = new globalThis.Request(`${origin}/sitemap.xml`);
  const paths: string[] = [...storefrontPaths];
  let cursor: string | undefined;
  try {
    do {
      const page: { items: ProductDto[]; nextCursor?: string | undefined } = await api(
        request,
      ).catalog.listProducts(cursor ? { cursor } : {});
      paths.push(
        ...page.items
          .filter((product) => product.status === "ACTIVE")
          .map((product) => `/products/${product.slug}`),
      );
      cursor = page.nextCursor;
    } while (cursor);
  } catch (error: unknown) {
    req.log.error({ err: error }, "sitemap catalog lookup failed");
    res
      .status(503)
      .set("Retry-After", "60")
      .type("text/plain")
      .send("Sitemap temporarily unavailable");
    return;
  }
  const urls: string[] = paths.flatMap((pathname: string) =>
    ["it", "en"].map(
      (locale: string) =>
        `<url><loc>${escapeXml(new URL(`/${locale}${pathname}`, origin).href)}</loc></url>`,
    ),
  );
  res
    .type("application/xml")
    .set("Cache-Control", "public, max-age=300")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`,
    );
}
