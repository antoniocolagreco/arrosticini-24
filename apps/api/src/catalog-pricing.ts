import type { GetProduct } from "@arrosticini/catalog";
import { DomainError } from "@arrosticini/kernel";
import type { CatalogPricing } from "@arrosticini/ordering";

export function catalogPricing(getProduct: GetProduct): CatalogPricing {
  return {
    async price(slug) {
      try {
        const product = await getProduct.execute(undefined, slug);
        return { name: product.name, unitPrice: product.price };
      } catch (error) {
        if (error instanceof DomainError && error.code === "PRODUCT_NOT_FOUND") return undefined;
        throw error;
      }
    },
  };
}
