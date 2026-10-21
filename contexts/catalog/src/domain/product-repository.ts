import type { Page, PageRequest } from "@arrosticini/kernel";
import type { Product, ProductStatus } from "./product.js";

export interface ProductSearch {
  text?: string;
  status?: ProductStatus;
}

export interface ProductRepository {
  findBySlug(slug: string): Promise<Product | undefined>;
  search(criteria: ProductSearch, page: PageRequest): Promise<Page<Product>>;
  create(product: Product): Promise<void>;
  save(product: Product): Promise<void>;
}
