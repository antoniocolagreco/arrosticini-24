import type { Product, ProductStatus } from "./product.js";

export interface ProductSearch {
  text?: string;
  status?: ProductStatus;
}

export interface ProductRepository {
  findBySlug(slug: string): Promise<Product | undefined>;
  search(criteria: ProductSearch): Promise<Product[]>;
  create(product: Product): Promise<void>;
}
