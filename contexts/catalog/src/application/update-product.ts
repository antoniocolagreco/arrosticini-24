import { type LocalizedText, Money } from "@arrosticini/kernel";
import type { Product, ProductStatus } from "../domain/product.js";
import type { ProductRepository } from "../domain/product-repository.js";
import type { Actor } from "./actor.js";
import { loadProductForAdmin } from "./load-product.js";

export interface UpdateProductCommand {
  name?: LocalizedText | undefined;
  description?: LocalizedText | undefined;
  pieces?: number | null | undefined;
  priceCents?: number | undefined;
  status?: ProductStatus | undefined;
}

export class UpdateProduct {
  readonly #products: ProductRepository;

  constructor(products: ProductRepository) {
    this.#products = products;
  }

  async execute(
    actor: Actor | undefined,
    slug: string,
    { name, description, pieces, priceCents, status }: UpdateProductCommand,
  ): Promise<Product> {
    const product = await loadProductForAdmin(this.#products, actor, slug);
    product.update(
      {
        ...(name === undefined ? {} : { name }),
        ...(description === undefined ? {} : { description }),
        ...(pieces === undefined ? {} : { pieces }),
        ...(priceCents === undefined ? {} : { price: Money.ofCents(priceCents) }),
        ...(status === undefined ? {} : { status }),
      },
      new Date(),
    );
    await this.#products.save(product);
    return product;
  }
}
