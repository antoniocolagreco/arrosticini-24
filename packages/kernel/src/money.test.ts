import { describe, expect, it } from "vitest";
import { DomainError } from "./domain-error.js";
import { Money } from "./money.js";

describe("Money", () => {
  it("creates an amount in EUR cents", () => {
    const money = Money.ofCents(3750);

    expect(money.amountCents).toBe(3750);
    expect(money.currency).toBe("EUR");
  });

  it.each([-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])("rejects %s cents", (cents) => {
    expect(() => Money.ofCents(cents)).toThrow(DomainError);
  });

  it("adds two amounts", () => {
    expect(Money.ofCents(3750).add(Money.ofCents(500)).amountCents).toBe(4250);
  });

  it("multiplies by a quantity", () => {
    expect(Money.ofCents(3750).multiply(3).amountCents).toBe(11250);
  });

  it.each([-1, 0.5])("rejects quantity %s", (quantity) => {
    expect(() => Money.ofCents(3750).multiply(quantity)).toThrow(DomainError);
  });

  it("compares by value", () => {
    expect(Money.ofCents(500).equals(Money.ofCents(500))).toBe(true);
    expect(Money.ofCents(500).equals(Money.ofCents(501))).toBe(false);
  });
});
