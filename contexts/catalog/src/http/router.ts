import { catalogContract, type ProductDto } from "@arrosticini/contracts";
import { implement } from "@orpc/server";
import type { Actor } from "../application/actor.js";
import type { GetProduct } from "../application/get-product.js";
import type { ListProducts } from "../application/list-products.js";
import type { Product } from "../domain/product.js";

export interface CatalogContext {
  actor: Actor | undefined;
}

export interface CatalogUseCases {
  listProducts: ListProducts;
  getProduct: GetProduct;
}

const os = implement(catalogContract).$context<CatalogContext>();

function toDto(product: Product): ProductDto {
  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    ...(product.pieces === undefined ? {} : { pieces: product.pieces }),
    priceCents: product.price.amountCents,
    currency: product.price.currency,
    images: product.images.map(({ id, key }) => ({ id, key })),
    status: product.status,
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function catalogRouter({ listProducts, getProduct }: CatalogUseCases) {
  return {
    listProducts: os.listProducts.handler(async ({ input, context }) => ({
      items: (await listProducts.execute(context.actor, input)).map(toDto),
    })),
    getProduct: os.getProduct.handler(async ({ input, context }) =>
      toDto(await getProduct.execute(context.actor, input.slug)),
    ),
  };
}
