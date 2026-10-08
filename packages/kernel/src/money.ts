import { DomainError } from "./domain-error.js";

export const CURRENCY = "EUR";

export type Currency = typeof CURRENCY;

export class Money {
  readonly amountCents: number;
  readonly currency: Currency = CURRENCY;

  private constructor(amountCents: number) {
    this.amountCents = amountCents;
  }

  static ofCents(amountCents: number): Money {
    if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
      throw new DomainError("INVALID_MONEY", `Invalid amount in cents: ${amountCents}`);
    }
    return new Money(amountCents);
  }

  add(other: Money): Money {
    return Money.ofCents(this.amountCents + other.amountCents);
  }

  multiply(quantity: number): Money {
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      throw new DomainError("INVALID_MONEY", `Invalid quantity: ${quantity}`);
    }
    return Money.ofCents(this.amountCents * quantity);
  }

  equals(other: Money): boolean {
    return this.amountCents === other.amountCents && this.currency === other.currency;
  }
}
