export type { Actor } from "./application/actor.js";
export { GetProduct } from "./application/get-product.js";
export { ListProducts, type ListProductsQuery } from "./application/list-products.js";
export {
  normalizeSearchText,
  PRODUCT_STATUSES,
  Product,
  type ProductImage,
  type ProductProps,
  type ProductStatus,
} from "./domain/product.js";
export type { ProductRepository, ProductSearch } from "./domain/product-repository.js";
export { type CatalogContext, type CatalogUseCases, catalogRouter } from "./http/router.js";
export { catalogTableDefinition } from "./infrastructure/catalog-table.js";
export { DynamoDbProductRepository } from "./infrastructure/dynamodb-product-repository.js";
export { S3ImageStorage } from "./infrastructure/s3-image-storage.js";
