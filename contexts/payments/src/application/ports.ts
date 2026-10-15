import type { Id, Locale, Money } from "@arrosticini/kernel";
import type { Actor } from "./actor.js";

export interface CheckoutLine {
  name: string;
  unitPrice: Money;
  quantity: number;
}

export interface CheckoutSessionRequest {
  orderId: Id;
  userId: Id;
  customerId: string;
  lines: readonly CheckoutLine[];
  locale: Locale;
  successUrl: string;
  cancelUrl: string;
}

export interface SetupSessionRequest {
  customerId: string;
  locale: Locale;
  returnUrl: string;
}

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export type GatewayEvent =
  | { id: string; kind: "CHECKOUT_PAID"; orderId: Id }
  | { id: string; kind: "CHECKOUT_EXPIRED"; orderId: Id }
  | { id: string; kind: "IGNORED" };

export interface PaymentGateway {
  createCustomer(customer: { userId: Id; email: string; name: string }): Promise<string>;
  createCheckoutSession(request: CheckoutSessionRequest): Promise<{ id: string; url: string }>;
  createSetupSession(request: SetupSessionRequest): Promise<string>;
  listCards(customerId: string): Promise<SavedCard[]>;
  findCardOwner(paymentMethodId: string): Promise<string | undefined>;
  detachCard(paymentMethodId: string): Promise<void>;
  parseEvent(payload: string | Uint8Array, signature: string): GatewayEvent;
}

export interface CustomerProfiles {
  find(actor: Actor): Promise<{ email: string; name: string }>;
}
