import { type LocalizedText, Money } from "@arrosticini/kernel";
import { Product, type ProductStatus } from "../domain/product.js";
import type { ProductRepository } from "../domain/product-repository.js";
import { type Actor, requireAdmin } from "./actor.js";

export interface CreateProductCommand {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  pieces?: number | undefined;
  priceCents: number;
  status?: ProductStatus | undefined;
}

export class CreateProduct {
  readonly #products: ProductRepository;

  constructor(products: ProductRepository) {
    this.#products = products;
  }

  async execute(actor: Actor | undefined, command: CreateProductCommand): Promise<Product> {
    requireAdmin(actor);
    const { slug, name, description, pieces, priceCents, status } = command;
    const product = Product.create(
      {
        slug,
        name,
        description,
        ...(pieces === undefined ? {} : { pieces }),
        price: Money.ofCents(priceCents),
        images: [],
        status: status ?? "DRAFT",
      },
      new Date(),
    );
    await this.#products.create(product);
    return product;
  }
}
