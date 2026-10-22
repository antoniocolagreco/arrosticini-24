import type { ProductDto } from "@arrosticini/contracts";

export function productImages(product: ProductDto): string[] {
  return product.images.map(({ key }) => `/images/${key}`);
}
