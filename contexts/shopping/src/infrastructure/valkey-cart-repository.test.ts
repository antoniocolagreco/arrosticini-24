import { Valkey } from "iovalkey";
import { afterAll, describe, expect, inject, it } from "vitest";
import { Cart } from "../domain/cart.js";
import { CART_TTL_SECONDS, ValkeyCartRepository } from "./valkey-cart-repository.js";

const valkey = new Valkey(inject("valkeyUrl"));
const repository = new ValkeyCartRepository(valkey);
const created = new Date("2026-10-09T10:00:00.000Z");

afterAll(async () => {
  await valkey.quit();
});

describe("ValkeyCartRepository", () => {
  it("saves and restores a cart with a seven-day expiry", async () => {
    const cart = Cart.create("01JB2Q7Z8X4M3N5P6R7S8T9V1A", created);
    cart.setLine("vino", 2, created);
    cart.setLine("arrosticini-75", 1, created);
    await repository.save(cart);

    const found = await repository.findById("01JB2Q7Z8X4M3N5P6R7S8T9V1A");

    expect(found?.lines).toEqual([
      { slug: "vino", quantity: 2 },
      { slug: "arrosticini-75", quantity: 1 },
    ]);
    expect(found?.ownerId).toBeUndefined();
    expect(found?.updatedAt).toEqual(created);
    const ttl = await valkey.ttl("cart:01JB2Q7Z8X4M3N5P6R7S8T9V1A");
    expect(ttl).toBeGreaterThan(CART_TTL_SECONDS - 5);
    expect(ttl).toBeLessThanOrEqual(CART_TTL_SECONDS);
  });

  it("returns undefined for a missing cart", async () => {
    expect(await repository.findById("01JB2Q7Z8X4M3N5P6R7S8T9V1B")).toBeUndefined();
    expect(await repository.findByOwner("01JB2Q7Z8X4M3N5P6R7S8T9V1C")).toBeUndefined();
  });

  it("finds a cart by its owner", async () => {
    const cart = Cart.create("01JB2Q7Z8X4M3N5P6R7S8T9V1D", created);
    cart.assignTo("01JB2Q7Z8X4M3N5P6R7S8T9V1E");
    await repository.save(cart);

    const found = await repository.findByOwner("01JB2Q7Z8X4M3N5P6R7S8T9V1E");

    expect(found?.id).toBe("01JB2Q7Z8X4M3N5P6R7S8T9V1D");
    expect(found?.ownerId).toBe("01JB2Q7Z8X4M3N5P6R7S8T9V1E");
    expect(await valkey.ttl("cart-owner:01JB2Q7Z8X4M3N5P6R7S8T9V1E")).toBeGreaterThan(
      CART_TTL_SECONDS - 5,
    );
  });

  it("deletes the absorbed cart when saving a merge", async () => {
    const owned = Cart.create("01JB2Q7Z8X4M3N5P6R7S8T9V1F", created);
    owned.assignTo("01JB2Q7Z8X4M3N5P6R7S8T9V1G");
    const anonymous = Cart.create("01JB2Q7Z8X4M3N5P6R7S8T9V1H", created);
    anonymous.setLine("vino", 1, created);
    await repository.save(owned);
    await repository.save(anonymous);

    owned.absorb(anonymous, created);
    await repository.saveMerged(owned, anonymous.id);

    expect((await repository.findById(owned.id))?.lines).toEqual([{ slug: "vino", quantity: 1 }]);
    expect(await repository.findById(anonymous.id)).toBeUndefined();
  });
});
