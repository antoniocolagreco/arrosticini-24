import { catalogContract, type ProductDto } from "@arrosticini/contracts";
import { localizedText } from "@arrosticini/kernel";
import { implement } from "@orpc/server";
import type { Actor } from "../application/actor.js";
import type { CreateProduct } from "../application/create-product.js";
import type { GetProduct } from "../application/get-product.js";
import type { ListProducts } from "../application/list-products.js";
import type { AddProductImage, RemoveProductImage } from "../application/product-images.js";
import type { UpdateProduct } from "../application/update-product.js";
import type { Product } from "../domain/product.js";

export interface CatalogContext {
  actor: Actor | undefined;
}

export interface CatalogUseCases {
  listProducts: ListProducts;
  getProduct: GetProduct;
  createProduct: CreateProduct;
  updateProduct: UpdateProduct;
  addProductImage: AddProductImage;
  removeProductImage: RemoveProductImage;
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

export function catalogRouter(useCases: CatalogUseCases) {
  return {
    listProducts: os.listProducts.handler(async ({ input, context }) => ({
      items: (await useCases.listProducts.execute(context.actor, input)).map(toDto),
    })),
    getProduct: os.getProduct.handler(async ({ input, context }) =>
      toDto(await useCases.getProduct.execute(context.actor, input.slug)),
    ),
    createProduct: os.createProduct.handler(async ({ input, context }) =>
      toDto(
        await useCases.createProduct.execute(context.actor, {
          ...input,
          name: localizedText(input.name),
          description: localizedText(input.description),
        }),
      ),
    ),
    updateProduct: os.updateProduct.handler(
      async ({ input: { slug, name, description, ...changes }, context }) =>
        toDto(
          await useCases.updateProduct.execute(context.actor, slug, {
            ...changes,
            ...(name === undefined ? {} : { name: localizedText(name) }),
            ...(description === undefined ? {} : { description: localizedText(description) }),
          }),
        ),
    ),
    addProductImage: os.addProductImage.handler(async ({ input, context }) =>
      toDto(
        await useCases.addProductImage.execute(
          context.actor,
          input.slug,
          new Uint8Array(await input.file.arrayBuffer()),
        ),
      ),
    ),
    removeProductImage: os.removeProductImage.handler(async ({ input, context }) =>
      toDto(await useCases.removeProductImage.execute(context.actor, input.slug, input.imageId)),
    ),
  };
}
