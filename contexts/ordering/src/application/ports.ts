import type { Id, Locale, LocalizedText, Money } from "@arrosticini/kernel";
import type { OrderLine, ShippingAddress } from "../domain/order.js";
import type { Actor } from "./actor.js";

export interface CartSnapshot {
  ownerId: Id | undefined;
  lines: readonly { slug: string; quantity: number }[];
}

export interface CartReader {
  find(cartId: Id): Promise<CartSnapshot | undefined>;
}

export interface ProductPrice {
  name: LocalizedText;
  unitPrice: Money;
}

export interface CatalogPricing {
  price(slug: string): Promise<ProductPrice | undefined>;
}

export interface CustomerDirectory {
  shippingAddress(actor: Actor, addressId: Id): Promise<ShippingAddress | undefined>;
}

export interface PaymentRequest {
  orderId: Id;
  lines: readonly OrderLine[];
  locale: Locale;
  returnUrl: string;
}

export interface PaymentInitiator {
  start(actor: Actor, request: PaymentRequest): Promise<string>;
}
