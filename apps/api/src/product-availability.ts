import type { GetProduct } from "@arrosticini/catalog";
import { DomainError } from "@arrosticini/kernel";
import type { ProductAvailability } from "@arrosticini/shopping";

export function catalogProductAvailability(getProduct: GetProduct): ProductAvailability {
  return {
    async isAvailable(slug) {
      try {
        await getProduct.execute(undefined, slug);
        return true;
      } catch (error) {
        if (error instanceof DomainError && error.code === "PRODUCT_NOT_FOUND") return false;
        throw error;
      }
    },
  };
}
