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

class ConflictingCartRepository extends InMemoryCartRepository {
  #conflicts: number;
  saves = 0;

  constructor(conflicts: number) {
    super();
    this.#conflicts = conflicts;
  }

  override async save(cart: Cart) {
    this.saves++;
    if (this.#conflicts > 0) {
      this.#conflicts--;
      throw new DomainError("CART_CONFLICT", `Cart changed concurrently: ${cart.id}`);
    }
    await super.save(cart);
  }
}

const products: ProductAvailability = {
  isAvailable: async (slug) => ["vino", "arrosticini-75"].includes(slug),
};

const created = new Date("2026-10-09T10:00:00.000Z");
const mario: Actor = { userId: "0192e1a0-0000-7000-8000-000000000013", role: "customer" };
const lucia: Actor = { userId: "0192e1a0-0000-7000-8000-000000000014", role: "customer" };

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
      new GetCart(new InMemoryCartRepository()).execute("0192e1a0-0000-7000-8000-000000000007"),
    ).rejects.toEqual(
      new DomainError("CART_NOT_FOUND", "Cart not found: 0192e1a0-0000-7000-8000-000000000007"),
    );
  });
});

describe("SetCartLine", () => {
  it("sets the quantity of an available product", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "0192e1a0-0000-7000-8000-000000000007", []);

    const cart = await new SetCartLine(carts, products).execute({
      cartId: "0192e1a0-0000-7000-8000-000000000007",
      slug: "vino",
      quantity: 3,
    });

    expect(cart.lines).toEqual([{ slug: "vino", quantity: 3 }]);
  });

  it("rejects a product that cannot be sold", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "0192e1a0-0000-7000-8000-000000000007", []);

    await expect(
      new SetCartLine(carts, products).execute({
        cartId: "0192e1a0-0000-7000-8000-000000000007",
        slug: "carbone",
        quantity: 1,
      }),
    ).rejects.toEqual(new DomainError("PRODUCT_NOT_FOUND", "Product not found: carbone"));
  });

  it("removes a line even when the product is no longer sold", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "0192e1a0-0000-7000-8000-000000000007", [["carbone", 2]]);

    const cart = await new SetCartLine(carts, products).execute({
      cartId: "0192e1a0-0000-7000-8000-000000000007",
      slug: "carbone",
      quantity: 0,
    });

    expect(cart.lines).toEqual([]);
  });

  it("retries when the cart changed concurrently", async () => {
    const carts = new ConflictingCartRepository(1);
    stored(carts, "0192e1a0-0000-7000-8000-000000000007", []);

    const cart = await new SetCartLine(carts, products).execute({
      cartId: "0192e1a0-0000-7000-8000-000000000007",
      slug: "vino",
      quantity: 3,
    });

    expect(cart.lines).toEqual([{ slug: "vino", quantity: 3 }]);
    expect(carts.saves).toBe(2);
  });

  it("gives up after three conflicts", async () => {
    const carts = new ConflictingCartRepository(3);
    stored(carts, "0192e1a0-0000-7000-8000-000000000007", []);

    await expect(
      new SetCartLine(carts, products).execute({
        cartId: "0192e1a0-0000-7000-8000-000000000007",
        slug: "vino",
        quantity: 3,
      }),
    ).rejects.toEqual(
      new DomainError(
        "CART_CONFLICT",
        "Cart changed concurrently: 0192e1a0-0000-7000-8000-000000000007",
      ),
    );
    expect(carts.saves).toBe(3);
  });

  it("fails for an unknown cart", async () => {
    await expect(
      new SetCartLine(new InMemoryCartRepository(), products).execute({
        cartId: "0192e1a0-0000-7000-8000-000000000007",
        slug: "vino",
        quantity: 1,
      }),
    ).rejects.toEqual(
      new DomainError("CART_NOT_FOUND", "Cart not found: 0192e1a0-0000-7000-8000-000000000007"),
    );
  });
});

describe("MergeCart", () => {
  it("requires a signed-in user", async () => {
    await expect(
      new MergeCart(new InMemoryCartRepository()).execute(
        undefined,
        "0192e1a0-0000-7000-8000-000000000007",
      ),
    ).rejects.toEqual(new DomainError("UNAUTHORIZED", "Authentication required"));
  });

  it("forbids admins", async () => {
    const carts = new InMemoryCartRepository();
    const cart = stored(carts, "0192e1a0-0000-7000-8000-000000000007", [["vino", 1]]);

    await expect(
      new MergeCart(carts).execute(
        { userId: "0192e1a0-0000-7000-8000-000000000015", role: "admin" },
        "0192e1a0-0000-7000-8000-000000000007",
      ),
    ).rejects.toEqual(new DomainError("FORBIDDEN", "Admins cannot own a cart"));
    expect(cart.ownerId).toBeUndefined();
  });

  it("gives the cart to a user who has none", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "0192e1a0-0000-7000-8000-000000000007", [["vino", 1]]);

    const cart = await new MergeCart(carts).execute(mario, "0192e1a0-0000-7000-8000-000000000007");

    expect(cart.id).toBe("0192e1a0-0000-7000-8000-000000000007");
    expect(cart.ownerId).toBe(mario.userId);
  });

  it("moves an anonymous cart into the user's cart", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "0192e1a0-0000-7000-8000-000000000007", [["vino", 2]], mario.userId);
    stored(carts, "0192e1a0-0000-7000-8000-000000000008", [
      ["vino", 1],
      ["arrosticini-75", 1],
    ]);

    const cart = await new MergeCart(carts).execute(mario, "0192e1a0-0000-7000-8000-000000000008");

    expect(cart.id).toBe("0192e1a0-0000-7000-8000-000000000007");
    expect(cart.lines).toEqual([
      { slug: "vino", quantity: 3 },
      { slug: "arrosticini-75", quantity: 1 },
    ]);
    expect(carts.carts.has("0192e1a0-0000-7000-8000-000000000008")).toBe(false);
  });

  it("returns the user's own cart unchanged", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "0192e1a0-0000-7000-8000-000000000007", [["vino", 2]], mario.userId);

    const cart = await new MergeCart(carts).execute(mario, "0192e1a0-0000-7000-8000-000000000007");

    expect(cart.lines).toEqual([{ slug: "vino", quantity: 2 }]);
  });

  it("hides another user's cart", async () => {
    const carts = new InMemoryCartRepository();
    stored(carts, "0192e1a0-0000-7000-8000-000000000007", [["vino", 2]], lucia.userId);

    await expect(
      new MergeCart(carts).execute(mario, "0192e1a0-0000-7000-8000-000000000007"),
    ).rejects.toEqual(
      new DomainError("CART_NOT_FOUND", "Cart not found: 0192e1a0-0000-7000-8000-000000000007"),
    );
  });
});

describe("EmptyOwnedCart", () => {
  it("empties only the cart of the given owner", async () => {
    const carts = new InMemoryCartRepository();
    const own = stored(carts, "0192e1a0-0000-7000-8000-000000000007", [["vino", 2]], mario.userId);
    const other = stored(
      carts,
      "0192e1a0-0000-7000-8000-000000000008",
      [["vino", 1]],
      lucia.userId,
    );

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
