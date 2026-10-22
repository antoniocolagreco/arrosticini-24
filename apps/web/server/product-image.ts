import { ProductImageFileName, ProductSlug } from "@arrosticini/contracts";
import type { RequestHandler } from "express";
import { api, getApiError } from "../app/lib/api.server.js";

export const serveProductImage: RequestHandler = async (req, res) => {
  const slug = ProductSlug.safeParse(req.params.slug);
  const fileName = ProductImageFileName.safeParse(req.params.fileName);
  if (!slug.success || !fileName.success) {
    res.status(404).end();
    return;
  }
  const request: Request = new Request(`http://web${req.path}`, {
    headers: { "x-request-id": String(req.id) },
  });
  try {
    const image: File = await api(request).catalog.getProductImage({
      slug: slug.data,
      fileName: fileName.data,
    });
    res
      .set("Cache-Control", "public, max-age=31536000, immutable")
      .type(image.type)
      .send(Buffer.from(await image.arrayBuffer()));
  } catch (error: unknown) {
    if (getApiError(error) !== "PRODUCT_IMAGE_NOT_FOUND") throw error;
    res.status(404).end();
  }
};
