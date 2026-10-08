import { DomainError } from "@arrosticini/kernel";
import type { Product } from "../domain/product.js";
import type { ProductRepository } from "../domain/product-repository.js";
import { type Actor, isAdmin } from "./actor.js";

export class GetProduct {
  readonly #products: ProductRepository;

  constructor(products: ProductRepository) {
    this.#products = products;
  }

  async execute(actor: Actor | undefined, slug: string): Promise<Product> {
    const product = await this.#products.findBySlug(slug);
    if (product === undefined || (product.status !== "ACTIVE" && !isAdmin(actor))) {
      throw new DomainError("PRODUCT_NOT_FOUND", `Product not found: ${slug}`);
    }
    return product;
  }
}
