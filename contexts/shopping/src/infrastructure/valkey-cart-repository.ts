import { DomainError, type Id } from "@arrosticini/kernel";
import type { Valkey } from "iovalkey";
import { Cart, type CartLine } from "../domain/cart.js";
import type { CartRepository } from "../domain/cart-repository.js";

export const CART_TTL_SECONDS = 7 * 24 * 60 * 60;

const SAVE_IF_UNCHANGED = `
if (redis.call("GET", KEYS[1]) or "") ~= ARGV[1] then
  return 0
end
redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[3])
return 1
`;

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
  readonly #stored = new WeakMap<Cart, string>();

  constructor(valkey: Valkey) {
    this.#valkey = valkey;
  }

  async findById(id: Id): Promise<Cart | undefined> {
    const value = await this.#valkey.get(cartKey(id));
    if (value === null) return undefined;
    const { updatedAt, ...stored } = JSON.parse(value) as StoredCart;
    const cart = Cart.restore({ ...stored, updatedAt: new Date(updatedAt) });
    this.#stored.set(cart, value);
    return cart;
  }

  async findByOwner(ownerId: Id): Promise<Cart | undefined> {
    const id = await this.#valkey.get(ownerKey(ownerId));
    return id === null ? undefined : this.findById(id);
  }

  async save(cart: Cart): Promise<void> {
    const stored: StoredCart = {
      id: cart.id,
      ...(cart.ownerId === undefined ? {} : { ownerId: cart.ownerId }),
      lines: [...cart.lines],
      updatedAt: cart.updatedAt.toISOString(),
    };
    const value = JSON.stringify(stored);
    const saved = await this.#valkey.eval(
      SAVE_IF_UNCHANGED,
      1,
      cartKey(cart.id),
      this.#stored.get(cart) ?? "",
      value,
      CART_TTL_SECONDS,
    );
    if (saved !== 1) {
      throw new DomainError("CART_CONFLICT", `Cart changed concurrently: ${cart.id}`);
    }
    this.#stored.set(cart, value);
    if (cart.ownerId !== undefined) {
      await this.#valkey.set(ownerKey(cart.ownerId), cart.id, "EX", CART_TTL_SECONDS);
    }
  }

  async saveMerged(cart: Cart, absorbedId: Id): Promise<void> {
    await this.save(cart);
    await this.#valkey.del(cartKey(absorbedId));
  }
}
