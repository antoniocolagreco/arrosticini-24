import { DomainError, type Id, newId } from "@arrosticini/kernel";
import { Cart } from "../domain/cart.js";
import type { CartRepository } from "../domain/cart-repository.js";
import type { Actor } from "./actor.js";
import type { ProductAvailability } from "./product-availability.js";

async function loadCart(carts: CartRepository, id: Id): Promise<Cart> {
  const cart = await carts.findById(id);
  if (cart === undefined) {
    throw new DomainError("CART_NOT_FOUND", `Cart not found: ${id}`);
  }
  return cart;
}

export class CreateCart {
  readonly #carts: CartRepository;

  constructor(carts: CartRepository) {
    this.#carts = carts;
  }

  async execute(): Promise<Cart> {
    const cart = Cart.create(newId(), new Date());
    await this.#carts.save(cart);
    return cart;
  }
}

export class GetCart {
  readonly #carts: CartRepository;

  constructor(carts: CartRepository) {
    this.#carts = carts;
  }

  execute(id: Id): Promise<Cart> {
    return loadCart(this.#carts, id);
  }
}

export interface SetCartLineCommand {
  cartId: Id;
  slug: string;
  quantity: number;
}

export class SetCartLine {
  readonly #carts: CartRepository;
  readonly #products: ProductAvailability;

  constructor(carts: CartRepository, products: ProductAvailability) {
    this.#carts = carts;
    this.#products = products;
  }

  async execute({ cartId, slug, quantity }: SetCartLineCommand): Promise<Cart> {
    const cart = await loadCart(this.#carts, cartId);
    if (quantity > 0 && !(await this.#products.isAvailable(slug))) {
      throw new DomainError("PRODUCT_NOT_FOUND", `Product not found: ${slug}`);
    }
    cart.setLine(slug, quantity, new Date());
    await this.#carts.save(cart);
    return cart;
  }
}

export class MergeCart {
  readonly #carts: CartRepository;

  constructor(carts: CartRepository) {
    this.#carts = carts;
  }

  async execute(actor: Actor | undefined, cartId: Id): Promise<Cart> {
    if (actor === undefined) {
      throw new DomainError("UNAUTHORIZED", "Authentication required");
    }
    const cart = await loadCart(this.#carts, cartId);
    if (cart.ownerId !== undefined && cart.ownerId !== actor.userId) {
      throw new DomainError("CART_NOT_FOUND", `Cart not found: ${cartId}`);
    }
    const owned = await this.#carts.findByOwner(actor.userId);
    if (owned === undefined || owned.id === cart.id) {
      cart.assignTo(actor.userId);
      await this.#carts.save(cart);
      return cart;
    }
    owned.absorb(cart, new Date());
    await this.#carts.saveMerged(owned, cart.id);
    return owned;
  }
}
