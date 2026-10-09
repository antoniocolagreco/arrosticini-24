import { DomainError, type Id, type Money } from "@arrosticini/kernel";

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "EXPIRED";

export interface PaymentProps {
  orderId: Id;
  userId: Id;
  stripeSessionId: string;
  amount: Money;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Payment {
  readonly #props: PaymentProps;

  private constructor(props: PaymentProps) {
    this.#props = props;
  }

  static start(
    props: Omit<PaymentProps, "status" | "createdAt" | "updatedAt">,
    now: Date,
  ): Payment {
    return new Payment({ ...props, status: "PENDING", createdAt: now, updatedAt: now });
  }

  static restore(props: PaymentProps): Payment {
    return new Payment(props);
  }

  get orderId(): Id {
    return this.#props.orderId;
  }

  get userId(): Id {
    return this.#props.userId;
  }

  get stripeSessionId(): string {
    return this.#props.stripeSessionId;
  }

  get amount(): Money {
    return this.#props.amount;
  }

  get status(): PaymentStatus {
    return this.#props.status;
  }

  get createdAt(): Date {
    return this.#props.createdAt;
  }

  get updatedAt(): Date {
    return this.#props.updatedAt;
  }

  succeed(now: Date): void {
    this.#settle("SUCCEEDED", now);
  }

  expire(now: Date): void {
    this.#settle("EXPIRED", now);
  }

  #settle(next: Exclude<PaymentStatus, "PENDING">, now: Date): void {
    if (this.#props.status === next) {
      return;
    }
    if (this.#props.status !== "PENDING") {
      throw new DomainError(
        "PAYMENT_INVALID_TRANSITION",
        `Payment of order ${this.orderId} cannot go from ${this.#props.status} to ${next}`,
      );
    }
    this.#props.status = next;
    this.#props.updatedAt = now;
  }
}
