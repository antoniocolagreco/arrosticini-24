import { DomainError } from "@arrosticini/kernel";
import { normalizeSearchText, type Product, type ProductStatus } from "../domain/product.js";
import type { ProductRepository } from "../domain/product-repository.js";
import { type Actor, isAdmin } from "./actor.js";

export interface ListProductsQuery {
  q?: string | undefined;
  status?: ProductStatus | undefined;
}

export class ListProducts {
  readonly #products: ProductRepository;

  constructor(products: ProductRepository) {
    this.#products = products;
  }

  async execute(actor: Actor | undefined, { q, status }: ListProductsQuery): Promise<Product[]> {
    if (status !== undefined && !isAdmin(actor)) {
      throw new DomainError("FORBIDDEN", "Only admins can filter products by status");
    }
    const text = q === undefined ? "" : normalizeSearchText(q);
    const products = await this.#products.search({
      ...(text === "" ? {} : { text }),
      ...(isAdmin(actor) ? (status === undefined ? {} : { status }) : { status: "ACTIVE" }),
    });
    return products.sort(
      (a, b) => a.price.amountCents - b.price.amountCents || a.slug.localeCompare(b.slug),
    );
  }
}
