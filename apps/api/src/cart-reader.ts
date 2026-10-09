import { DomainError } from "@arrosticini/kernel";
import type { CartReader } from "@arrosticini/ordering";
import type { GetCart } from "@arrosticini/shopping";

export function shoppingCartReader(getCart: GetCart): CartReader {
  return {
    async find(cartId) {
      try {
        const cart = await getCart.execute(cartId);
        return { ownerId: cart.ownerId, lines: cart.lines };
      } catch (error) {
        if (error instanceof DomainError && error.code === "CART_NOT_FOUND") return undefined;
        throw error;
      }
    },
  };
}
