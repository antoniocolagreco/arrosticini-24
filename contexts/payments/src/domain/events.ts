import type { DomainEvent, Id } from "@arrosticini/kernel";

export interface PaymentSettledPayload {
  orderId: Id;
  userId: Id;
}

export type PaymentSucceeded = DomainEvent<"PaymentSucceeded", PaymentSettledPayload>;

export type PaymentExpired = DomainEvent<"PaymentExpired", PaymentSettledPayload>;
