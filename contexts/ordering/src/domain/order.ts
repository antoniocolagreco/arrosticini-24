import { DomainError, type Id, type LocalizedText, Money } from "@arrosticini/kernel";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELLED"
  | "SHIPPED"
  | "DELIVERED"
  | "LOST";

export interface OrderLine {
  readonly slug: string;
  readonly name: LocalizedText;
  readonly unitPrice: Money;
  readonly quantity: number;
}

export interface ShippingAddress {
  readonly fullName: string;
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly postalCode: string;
  readonly country: string;
  readonly phone: string;
}

export interface Shipment {
  readonly carrier: string;
  readonly trackingNumber?: string;
  readonly trackingUrl?: string;
}

const SHIPPED_STATUSES: readonly OrderStatus[] = ["SHIPPED", "DELIVERED", "LOST"];

export interface OrderProps {
  id: Id;
  userId: Id;
  lines: readonly OrderLine[];
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  shipment?: Shipment;
  createdAt: Date;
  paidAt?: Date;
}

export class Order {
  readonly #props: OrderProps;

  private constructor(props: OrderProps) {
    this.#props = props;
  }

  static place(props: Omit<OrderProps, "status" | "createdAt" | "paidAt">, now: Date): Order {
    if (props.lines.length === 0) {
      throw new DomainError("CART_EMPTY", `Order ${props.id} has no lines`);
    }
    for (const { slug, quantity } of props.lines) {
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        throw new DomainError("INVALID_QUANTITY", `Invalid quantity for ${slug}: ${quantity}`);
      }
    }
    return new Order({ ...props, status: "PENDING_PAYMENT", createdAt: now });
  }

  static restore(props: OrderProps): Order {
    return new Order(props);
  }

  get id(): Id {
    return this.#props.id;
  }

  get userId(): Id {
    return this.#props.userId;
  }

  get lines(): readonly OrderLine[] {
    return this.#props.lines;
  }

  get shippingAddress(): ShippingAddress {
    return this.#props.shippingAddress;
  }

  get status(): OrderStatus {
    return this.#props.status;
  }

  get shipment(): Shipment | undefined {
    return this.#props.shipment;
  }

  get createdAt(): Date {
    return this.#props.createdAt;
  }

  get paidAt(): Date | undefined {
    return this.#props.paidAt;
  }

  get total(): Money {
    return this.#props.lines.reduce(
      (total, line) => total.add(line.unitPrice.multiply(line.quantity)),
      Money.ofCents(0),
    );
  }

  markPaid(now: Date): void {
    this.#transition(["PENDING_PAYMENT"], "PAID");
    this.#props.paidAt = now;
  }

  cancel(): void {
    this.#transition(["PENDING_PAYMENT"], "CANCELLED");
  }

  ship(shipment: Shipment): void {
    if (!SHIPPED_STATUSES.includes(this.#props.status)) {
      this.#transition(["PAID"], "SHIPPED");
    }
    this.#props.shipment = shipment;
  }

  deliver(): void {
    this.#transition(["SHIPPED"], "DELIVERED");
  }

  markLost(): void {
    this.#transition(["SHIPPED"], "LOST");
  }

  changeShippingAddress(address: ShippingAddress): void {
    if (this.#props.status !== "PENDING_PAYMENT" && this.#props.status !== "PAID") {
      throw new DomainError(
        "ORDER_NOT_EDITABLE",
        `Order ${this.id} cannot change address when ${this.#props.status}`,
      );
    }
    this.#props.shippingAddress = address;
  }

  #transition(from: readonly OrderStatus[], next: OrderStatus): void {
    if (!from.includes(this.#props.status)) {
      throw new DomainError(
        "ORDER_INVALID_TRANSITION",
        `Order ${this.id} cannot go from ${this.#props.status} to ${next}`,
      );
    }
    this.#props.status = next;
  }
}
