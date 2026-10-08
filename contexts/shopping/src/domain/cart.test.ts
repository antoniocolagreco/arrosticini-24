import { DomainError } from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { Cart } from "./cart.js";

const created = new Date("2026-10-09T10:00:00.000Z");
const changed = new Date("2026-10-09T10:05:00.000Z");

function cart(id = "01JB2Q7Z8X4M3N5P6R7S8T9V0A"): Cart {
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
    const owned = cart("01JB2Q7Z8X4M3N5P6R7S8T9V0A");
    owned.setLine("vino", 60, created);
    owned.setLine("carbone", 1, created);
    const anonymous = cart("01JB2Q7Z8X4M3N5P6R7S8T9V0B");
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

describe("Cart.assignTo", () => {
  it("binds the cart to its owner", () => {
    const target = cart();
    target.assignTo("01JB2Q7Z8X4M3N5P6R7S8T9V0X");
    target.assignTo("01JB2Q7Z8X4M3N5P6R7S8T9V0X");

    expect(target.ownerId).toBe("01JB2Q7Z8X4M3N5P6R7S8T9V0X");
  });

  it("refuses a second owner", () => {
    const target = cart();
    target.assignTo("01JB2Q7Z8X4M3N5P6R7S8T9V0X");

    expect(() => target.assignTo("01JB2Q7Z8X4M3N5P6R7S8T9V0Y")).toThrow(
      new DomainError("CART_OWNED", "Cart 01JB2Q7Z8X4M3N5P6R7S8T9V0A belongs to another user"),
    );
  });
});
