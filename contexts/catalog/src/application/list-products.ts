import { DomainError, PAGE_SIZE, type Page } from "@arrosticini/kernel";
import { normalizeSearchText, type Product, type ProductStatus } from "../domain/product.js";
import type { ProductRepository } from "../domain/product-repository.js";
import { type Actor, isAdmin } from "./actor.js";

export interface ListProductsQuery {
  q?: string | undefined;
  status?: ProductStatus | undefined;
  cursor?: string | undefined;
}

export class ListProducts {
  readonly #products: ProductRepository;

  constructor(products: ProductRepository) {
    this.#products = products;
  }

  async execute(
    actor: Actor | undefined,
    { q, status, cursor }: ListProductsQuery,
  ): Promise<Page<Product>> {
    if (status !== undefined && !isAdmin(actor)) {
      throw new DomainError("FORBIDDEN", "Only admins can filter products by status");
    }
    const text = q === undefined ? "" : normalizeSearchText(q);
    return this.#products.search(
      {
        ...(text === "" ? {} : { text }),
        ...(isAdmin(actor) ? (status === undefined ? {} : { status }) : { status: "ACTIVE" }),
      },
      { cursor, limit: PAGE_SIZE },
    );
  }
}
