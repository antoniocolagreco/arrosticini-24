import { DomainError } from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { Cart } from "./cart.js";

const created = new Date("2026-10-09T10:00:00.000Z");
const changed = new Date("2026-10-09T10:05:00.000Z");

function cart(id = "0192e1a0-0000-7000-8000-000000000007"): Cart {
  return Cart.create(id, created);
}

describe("Cart.setLine", () => {
  it("adds, updates and removes lines in insertion order", () => {
    const target = cart();
    target.setLine("vino", 2, created);
    target.setLine("arrosticini-75", 1, created);
    target.setLine("vino", 5, changed);

    expect(target.lines).toEqual([
      { slug: "vino", quantity: 5 },
      { slug: "arrosticini-75", quantity: 1 },
    ]);
    expect(target.updatedAt).toEqual(changed);

    target.setLine("vino", 0, changed);

    expect(target.lines).toEqual([{ slug: "arrosticini-75", quantity: 1 }]);
  });

  it("ignores the removal of a missing line", () => {
    const target = cart();
    target.setLine("vino", 0, changed);

    expect(target.lines).toEqual([]);
  });

  it.each([-1, 100, 1.5])("rejects quantity %o", (quantity) => {
    expect(() => cart().setLine("vino", quantity, changed)).toThrow(
      new DomainError("INVALID_QUANTITY", `Invalid quantity: ${quantity}`),
    );
  });
});

describe("Cart.absorb", () => {
  it("adds the other cart's quantities, capped at 99", () => {
    const owned = cart("0192e1a0-0000-7000-8000-000000000007");
    owned.setLine("vino", 60, created);
    owned.setLine("carbone", 1, created);
    const anonymous = cart("0192e1a0-0000-7000-8000-000000000008");
    anonymous.setLine("vino", 50, created);
    anonymous.setLine("arrosticini-225", 2, created);

    owned.absorb(anonymous, changed);

    expect(owned.lines).toEqual([
      { slug: "vino", quantity: 99 },
      { slug: "carbone", quantity: 1 },
      { slug: "arrosticini-225", quantity: 2 },
    ]);
    expect(owned.updatedAt).toEqual(changed);
  });
});

describe("Cart.removePurchased", () => {
  it("removes the purchased quantities and keeps the owner", () => {
    const target = cart();
    target.setLine("vino", 2, created);
    target.setLine("arrosticini-75", 1, created);
    target.assignTo("0192e1a0-0000-7000-8000-000000000013");

    target.removePurchased(
      [
        { slug: "vino", quantity: 2 },
        { slug: "arrosticini-75", quantity: 1 },
      ],
      changed,
    );

    expect(target.lines).toEqual([]);
    expect(target.ownerId).toBe("0192e1a0-0000-7000-8000-000000000013");
    expect(target.updatedAt).toEqual(changed);
  });

  it("keeps lines and quantities added after checkout", () => {
    const target = cart();
    target.setLine("vino", 3, created);
    target.setLine("arrosticini-75", 1, created);

    target.removePurchased([{ slug: "vino", quantity: 1 }], changed);

    expect(target.lines).toEqual([
      { slug: "vino", quantity: 2 },
      { slug: "arrosticini-75", quantity: 1 },
    ]);
  });

  it("ignores purchased lines removed from the cart after checkout", () => {
    const target = cart();
    target.setLine("vino", 1, created);

    target.removePurchased(
      [
        { slug: "vino", quantity: 2 },
        { slug: "carbone", quantity: 1 },
      ],
      changed,
    );

    expect(target.lines).toEqual([]);
  });
});

describe("Cart.assignTo", () => {
  it("binds the cart to its owner", () => {
    const target = cart();
    target.assignTo("0192e1a0-0000-7000-8000-000000000013");
    target.assignTo("0192e1a0-0000-7000-8000-000000000013");

    expect(target.ownerId).toBe("0192e1a0-0000-7000-8000-000000000013");
  });

  it("refuses a second owner", () => {
    const target = cart();
    target.assignTo("0192e1a0-0000-7000-8000-000000000013");

    expect(() => target.assignTo("0192e1a0-0000-7000-8000-000000000014")).toThrow(
      new DomainError(
        "CART_OWNED",
        "Cart 0192e1a0-0000-7000-8000-000000000007 belongs to another user",
      ),
    );
  });
});
