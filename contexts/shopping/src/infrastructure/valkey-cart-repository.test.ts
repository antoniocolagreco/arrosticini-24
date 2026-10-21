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
    const cart = Cart.create("0192e1a0-0000-7000-8000-00000000001e", created);
    cart.setLine("vino", 2, created);
    cart.setLine("arrosticini-75", 1, created);
    await repository.save(cart);

    const found = await repository.findById("0192e1a0-0000-7000-8000-00000000001e");

    expect(found?.lines).toEqual([
      { slug: "vino", quantity: 2 },
      { slug: "arrosticini-75", quantity: 1 },
    ]);
    expect(found?.ownerId).toBeUndefined();
    expect(found?.updatedAt).toEqual(created);
    const ttl = await valkey.ttl("cart:0192e1a0-0000-7000-8000-00000000001e");
    expect(ttl).toBeGreaterThan(CART_TTL_SECONDS - 5);
    expect(ttl).toBeLessThanOrEqual(CART_TTL_SECONDS);
  });

  it("returns undefined for a missing cart", async () => {
    expect(await repository.findById("0192e1a0-0000-7000-8000-00000000001f")).toBeUndefined();
    expect(await repository.findByOwner("0192e1a0-0000-7000-8000-000000000020")).toBeUndefined();
  });

  it("finds a cart by its owner", async () => {
    const cart = Cart.create("0192e1a0-0000-7000-8000-000000000021", created);
    cart.assignTo("0192e1a0-0000-7000-8000-000000000022");
    await repository.save(cart);

    const found = await repository.findByOwner("0192e1a0-0000-7000-8000-000000000022");

    expect(found?.id).toBe("0192e1a0-0000-7000-8000-000000000021");
    expect(found?.ownerId).toBe("0192e1a0-0000-7000-8000-000000000022");
    expect(await valkey.ttl("cart-owner:0192e1a0-0000-7000-8000-000000000022")).toBeGreaterThan(
      CART_TTL_SECONDS - 5,
    );
  });

  it("deletes the absorbed cart when saving a merge", async () => {
    const owned = Cart.create("0192e1a0-0000-7000-8000-000000000023", created);
    owned.assignTo("0192e1a0-0000-7000-8000-000000000024");
    const anonymous = Cart.create("0192e1a0-0000-7000-8000-000000000025", created);
    anonymous.setLine("vino", 1, created);
    await repository.save(owned);
    await repository.save(anonymous);

    owned.absorb(anonymous, created);
    await repository.saveMerged(owned, anonymous.id);

    expect((await repository.findById(owned.id))?.lines).toEqual([{ slug: "vino", quantity: 1 }]);
    expect(await repository.findById(anonymous.id)).toBeUndefined();
  });
});
