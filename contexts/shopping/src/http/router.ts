import { type CartDto, shoppingContract } from "@arrosticini/contracts";
import { implement } from "@orpc/server";
import type { Actor } from "../application/actor.js";
import type { CreateCart, GetCart, MergeCart, SetCartLine } from "../application/carts.js";
import type { Cart } from "../domain/cart.js";

export interface ShoppingContext {
  actor: Actor | undefined;
}

export interface ShoppingUseCases {
  createCart: CreateCart;
  getCart: GetCart;
  setCartLine: SetCartLine;
  mergeCart: MergeCart;
}

const os = implement(shoppingContract).$context<ShoppingContext>();

function toDto(cart: Cart): CartDto {
  return {
    id: cart.id,
    lines: cart.lines.map(({ slug, quantity }) => ({ slug, quantity })),
    updatedAt: cart.updatedAt.toISOString(),
  };
}

export function shoppingRouter(useCases: ShoppingUseCases) {
  return {
    createCart: os.createCart.handler(async () => toDto(await useCases.createCart.execute())),
    getCart: os.getCart.handler(async ({ input }) =>
      toDto(await useCases.getCart.execute(input.id)),
    ),
    setCartLine: os.setCartLine.handler(async ({ input: { id, slug, quantity } }) =>
      toDto(await useCases.setCartLine.execute({ cartId: id, slug, quantity })),
    ),
    mergeCart: os.mergeCart.handler(async ({ input, context }) =>
      toDto(await useCases.mergeCart.execute(context.actor, input.id)),
    ),
  };
}
