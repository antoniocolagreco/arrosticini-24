import type { ProductDto } from "@arrosticini/contracts";

export function productImages(product: ProductDto): string[] {
  const base: string = (process.env.MEDIA_BASE_URL ?? "/images").replace(/\/$/, "");
  return product.images.map(({ key }) => `${base}/${key}`);
}
