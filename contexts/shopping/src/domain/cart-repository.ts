import type { Id } from "@arrosticini/kernel";
import type { Cart } from "./cart.js";

export interface CartRepository {
  findById(id: Id): Promise<Cart | undefined>;
  findByOwner(ownerId: Id): Promise<Cart | undefined>;
  save(cart: Cart): Promise<void>;
  saveMerged(cart: Cart, absorbedId: Id): Promise<void>;
}
