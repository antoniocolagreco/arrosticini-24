import { DomainError, type Id } from "@arrosticini/kernel";

export const MAX_LINE_QUANTITY = 99;

export interface CartLine {
  readonly slug: string;
  readonly quantity: number;
}

export interface CartProps {
  id: Id;
  ownerId?: Id;
  lines: CartLine[];
  updatedAt: Date;
}

export class Cart {
  readonly #props: CartProps;

  private constructor(props: CartProps) {
    this.#props = props;
  }

  static create(id: Id, now: Date): Cart {
    return new Cart({ id, lines: [], updatedAt: now });
  }

  static restore(props: CartProps): Cart {
    return new Cart(props);
  }

  get id(): Id {
    return this.#props.id;
  }

  get ownerId(): Id | undefined {
    return this.#props.ownerId;
  }

  get lines(): readonly CartLine[] {
    return this.#props.lines;
  }

  get updatedAt(): Date {
    return this.#props.updatedAt;
  }

  setLine(slug: string, quantity: number, now: Date): void {
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_LINE_QUANTITY) {
      throw new DomainError("INVALID_QUANTITY", `Invalid quantity: ${quantity}`);
    }
    const index = this.#props.lines.findIndex((line) => line.slug === slug);
    if (quantity === 0) {
      if (index !== -1) this.#props.lines.splice(index, 1);
    } else if (index === -1) {
      this.#props.lines.push({ slug, quantity });
    } else {
      this.#props.lines[index] = { slug, quantity };
    }
    this.#props.updatedAt = now;
  }

  absorb(other: Cart, now: Date): void {
    for (const { slug, quantity } of other.lines) {
      const current = this.#props.lines.find((line) => line.slug === slug)?.quantity ?? 0;
      this.setLine(slug, Math.min(current + quantity, MAX_LINE_QUANTITY), now);
    }
    this.#props.updatedAt = now;
  }

  clear(now: Date): void {
    this.#props.lines = [];
    this.#props.updatedAt = now;
  }

  assignTo(ownerId: Id): void {
    if (this.#props.ownerId !== undefined && this.#props.ownerId !== ownerId) {
      throw new DomainError("CART_OWNED", `Cart ${this.id} belongs to another user`);
    }
    this.#props.ownerId = ownerId;
  }
}
