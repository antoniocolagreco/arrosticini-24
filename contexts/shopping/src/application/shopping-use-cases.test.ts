import { DomainError, type Id } from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { Cart } from "../domain/cart.js";
import type { CartRepository } from "../domain/cart-repository.js";
import type { Actor } from "./actor.js";
import { CreateCart, EmptyOwnedCart, GetCart, MergeCart, SetCartLine } from "./carts.js";
import type { ProductAvailability } from "./product-availability.js";

class InMemoryCartRepository implements CartRepository {
  readonly carts = new Map<Id, Cart>();

  async findById(id: Id) {
    return this.carts.get(id);
  }

  async findByOwner(ownerId: Id) {
    return [...this.carts.values()].find((cart) => cart.ownerId === ownerId);
  }

  async save(cart: Cart) {
    this.carts.set(cart.id, cart);
  }

  async saveMerged(cart: Cart, absorbedId: Id) {
    this.carts.set(cart.id, cart);
    this.carts.delete(absorbedId);
  }
}

const products: ProductAvailability = {
  isAvailable: async (slug) => ["vino", "arrosticini-75"].includes(slug),
};

const created = new Date("2026-10-09T10:00:00.000Z");
const mario: Actor = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X", role: "customer" };
const lucia: Actor = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y", role: "customer" };

function stored(
  carts: InMemoryCartRepository,
  id: Id,
  lines: [string, number][],
  ownerId?: Id,
): Cart {
  const cart = Cart.create(id, created);
  for (const [slug, quantity] of lines) cart.setLine(slug, quantity, created);
  if (ownerId !== undefined) cart.assignTo(ownerId);
  carts.carts.set(id, cart);
  return cart;
}

describe("CreateCart", () => {
  it("stores an empty anonymous cart", async () => {
    const carts = new InMemoryCartRepository();
    const cart = await new CreateCart(carts).execute();

    expect(cart.lines).toEqual([]);
    expect(cart.ownerId).toBeUndefined();
    expect(carts.carts.get(cart.id)).toBe(cart);
  });
});

describe("GetCart", () => {
  it("fails for an unknown cart", async () => {
    await expect(
      new GetCart(new InMemoryCartRepository()).execute("01JB2Q7Z8X4M3N5P6R7S8T9V0A"),
    ).rejects.toEqual(
      new DomainError("CART_NOT_FOUND", "Cart not found: 01JB2Q7Z8X4M3N5P6R7S8T9V0A"),
    );
  });
});

describe("SetCartLine", () => {
  it("sets the quantity of an available product", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "01JB2Q7Z8X4M3N5P6R7S8T9V0A", []);

    const cart = await new SetCartLine(carts, products).execute({
      cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      slug: "vino",
      quantity: 3,
    });

    expect(cart.lines).toEqual([{ slug: "vino", quantity: 3 }]);
  });

  it("rejects a product that cannot be sold", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "01JB2Q7Z8X4M3N5P6R7S8T9V0A", []);

    await expect(
      new SetCartLine(carts, products).execute({
        cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
        slug: "carbone",
        quantity: 1,
      }),
    ).rejects.toEqual(new DomainError("PRODUCT_NOT_FOUND", "Product not found: carbone"));
  });

  it("removes a line even when the product is no longer sold", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "01JB2Q7Z8X4M3N5P6R7S8T9V0A", [["carbone", 2]]);

    const cart = await new SetCartLine(carts, products).execute({
      cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      slug: "carbone",
      quantity: 0,
    });

    expect(cart.lines).toEqual([]);
  });

  it("fails for an unknown cart", async () => {
    await expect(
      new SetCartLine(new InMemoryCartRepository(), products).execute({
        cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
        slug: "vino",
        quantity: 1,
      }),
    ).rejects.toEqual(
      new DomainError("CART_NOT_FOUND", "Cart not found: 01JB2Q7Z8X4M3N5P6R7S8T9V0A"),
    );
  });
});

describe("MergeCart", () => {
  it("requires a signed-in user", async () => {
    await expect(
      new MergeCart(new InMemoryCartRepository()).execute(undefined, "01JB2Q7Z8X4M3N5P6R7S8T9V0A"),
    ).rejects.toEqual(new DomainError("UNAUTHORIZED", "Authentication required"));
  });

  it("forbids admins", async () => {
    const carts = new InMemoryCartRepository();
    const cart = stored(carts, "01JB2Q7Z8X4M3N5P6R7S8T9V0A", [["vino", 1]]);

    await expect(
      new MergeCart(carts).execute(
        { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Z", role: "admin" },
        "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      ),
    ).rejects.toEqual(new DomainError("FORBIDDEN", "Admins cannot own a cart"));
    expect(cart.ownerId).toBeUndefined();
  });

  it("gives the cart to a user who has none", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "01JB2Q7Z8X4M3N5P6R7S8T9V0A", [["vino", 1]]);

    const cart = await new MergeCart(carts).execute(mario, "01JB2Q7Z8X4M3N5P6R7S8T9V0A");

    expect(cart.id).toBe("01JB2Q7Z8X4M3N5P6R7S8T9V0A");
    expect(cart.ownerId).toBe(mario.userId);
  });

  it("moves an anonymous cart into the user's cart", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "01JB2Q7Z8X4M3N5P6R7S8T9V0A", [["vino", 2]], mario.userId);
    stored(carts, "01JB2Q7Z8X4M3N5P6R7S8T9V0B", [
      ["vino", 1],
      ["arrosticini-75", 1],
    ]);

    const cart = await new MergeCart(carts).execute(mario, "01JB2Q7Z8X4M3N5P6R7S8T9V0B");

    expect(cart.id).toBe("01JB2Q7Z8X4M3N5P6R7S8T9V0A");
    expect(cart.lines).toEqual([
      { slug: "vino", quantity: 3 },
      { slug: "arrosticini-75", quantity: 1 },
    ]);
    expect(carts.carts.has("01JB2Q7Z8X4M3N5P6R7S8T9V0B")).toBe(false);
  });

  it("returns the user's own cart unchanged", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "01JB2Q7Z8X4M3N5P6R7S8T9V0A", [["vino", 2]], mario.userId);

    const cart = await new MergeCart(carts).execute(mario, "01JB2Q7Z8X4M3N5P6R7S8T9V0A");

    expect(cart.lines).toEqual([{ slug: "vino", quantity: 2 }]);
  });

  it("hides another user's cart", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "01JB2Q7Z8X4M3N5P6R7S8T9V0A", [["vino", 2]], lucia.userId);

    await expect(new MergeCart(carts).execute(mario, "01JB2Q7Z8X4M3N5P6R7S8T9V0A")).rejects.toEqual(
      new DomainError("CART_NOT_FOUND", "Cart not found: 01JB2Q7Z8X4M3N5P6R7S8T9V0A"),
    );
  });
});

describe("EmptyOwnedCart", () => {
  it("empties only the cart of the given owner", async () => {
    const carts = new InMemoryCartRepository();
    const own = stored(carts, "01JB2Q7Z8X4M3N5P6R7S8T9V0A", [["vino", 2]], mario.userId);
    const other = stored(carts, "01JB2Q7Z8X4M3N5P6R7S8T9V0B", [["vino", 1]], lucia.userId);

    await new EmptyOwnedCart(carts).execute(mario.userId);

    expect(own.lines).toEqual([]);
    expect(other.lines).toEqual([{ slug: "vino", quantity: 1 }]);
  });

  it("does nothing when the owner has no cart", async () => {
    await expect(
      new EmptyOwnedCart(new InMemoryCartRepository()).execute(mario.userId),
    ).resolves.toBeUndefined();
  });
});
