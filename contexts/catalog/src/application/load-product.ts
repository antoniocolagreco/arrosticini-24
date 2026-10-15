import { DomainError } from "@arrosticini/kernel";
import type { Product } from "../domain/product.js";
import type { ProductRepository } from "../domain/product-repository.js";
import { type Actor, requireAdmin } from "./actor.js";

export async function loadProductForAdmin(
  products: ProductRepository,
  actor: Actor | undefined,
  slug: string,
): Promise<Product> {
  requireAdmin(actor);
  const product = await products.findBySlug(slug);
  if (product === undefined) {
    throw new DomainError("PRODUCT_NOT_FOUND", `Product not found: ${slug}`);
  }
  return product;
}
