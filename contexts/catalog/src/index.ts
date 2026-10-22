export type { Actor } from "./application/actor.js";
export { CreateProduct, type CreateProductCommand } from "./application/create-product.js";
export { GetProduct } from "./application/get-product.js";
export type { ImageStorage, StoredImage } from "./application/image-storage.js";
export { ListProducts, type ListProductsQuery } from "./application/list-products.js";
export {
  AddProductImage,
  GetProductImage,
  RemoveProductImage,
} from "./application/product-images.js";
export { UpdateProduct, type UpdateProductCommand } from "./application/update-product.js";
export { detectImageType, IMAGE_EXTENSIONS, type ImageType } from "./domain/image-type.js";
export {
  normalizeSearchText,
  PRODUCT_STATUSES,
  Product,
  type ProductChanges,
  type ProductImage,
  type ProductProps,
  type ProductStatus,
} from "./domain/product.js";
export type { ProductRepository, ProductSearch } from "./domain/product-repository.js";
export { type CatalogContext, type CatalogUseCases, catalogRouter } from "./http/router.js";
export { DynamoDbProductRepository } from "./infrastructure/dynamodb-product-repository.js";
export { productsTableDefinition } from "./infrastructure/products-table.js";
export { S3ImageStorage } from "./infrastructure/s3-image-storage.js";
