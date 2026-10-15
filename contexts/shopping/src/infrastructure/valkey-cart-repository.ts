import type { Id } from "@arrosticini/kernel";
import type { ChainableCommander, Valkey } from "iovalkey";
import { Cart, type CartLine } from "../domain/cart.js";
import type { CartRepository } from "../domain/cart-repository.js";

export const CART_TTL_SECONDS = 7 * 24 * 60 * 60;

interface StoredCart {
  id: Id;
  ownerId?: Id;
  lines: CartLine[];
  updatedAt: string;
}

const cartKey = (id: Id): string => `cart:${id}`;
const ownerKey = (ownerId: Id): string => `cart-owner:${ownerId}`;

export class ValkeyCartRepository implements CartRepository {
  readonly #valkey: Valkey;

  constructor(valkey: Valkey) {
    this.#valkey = valkey;
  }

  async findById(id: Id): Promise<Cart | undefined> {
    const value = await this.#valkey.get(cartKey(id));
    if (value === null) return undefined;
    const { updatedAt, ...stored } = JSON.parse(value) as StoredCart;
    return Cart.restore({ ...stored, updatedAt: new Date(updatedAt) });
  }

  async findByOwner(ownerId: Id): Promise<Cart | undefined> {
    const id = await this.#valkey.get(ownerKey(ownerId));
    return id === null ? undefined : this.findById(id);
  }

  async save(cart: Cart): Promise<void> {
    await this.#write(this.#valkey.multi(), cart).exec();
  }

  async saveMerged(cart: Cart, absorbedId: Id): Promise<void> {
    await this.#write(this.#valkey.multi(), cart).del(cartKey(absorbedId)).exec();
  }

  #write(transaction: ChainableCommander, cart: Cart): ChainableCommander {
    const stored: StoredCart = {
      id: cart.id,
      ...(cart.ownerId === undefined ? {} : { ownerId: cart.ownerId }),
      lines: [...cart.lines],
      updatedAt: cart.updatedAt.toISOString(),
    };
    transaction.set(cartKey(cart.id), JSON.stringify(stored), "EX", CART_TTL_SECONDS);
    if (cart.ownerId !== undefined) {
      transaction.set(ownerKey(cart.ownerId), cart.id, "EX", CART_TTL_SECONDS);
    }
    return transaction;
  }
}
