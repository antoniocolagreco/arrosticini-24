import { DomainError, type Id } from "@arrosticini/kernel";
import Stripe from "stripe";
import type {
  CheckoutSessionRequest,
  GatewayEvent,
  PaymentGateway,
  SavedCard,
  SetupSessionRequest,
} from "../application/ports.js";

export const CHECKOUT_SESSION_TTL_SECONDS = 30 * 60;

export class StripePaymentGateway implements PaymentGateway {
  readonly #stripe: Stripe;
  readonly #webhookSecret: string;

  constructor(stripe: Stripe, webhookSecret: string) {
    this.#stripe = stripe;
    this.#webhookSecret = webhookSecret;
  }

  async createCustomer({
    userId,
    email,
    name,
  }: {
    userId: Id;
    email: string;
    name: string;
  }): Promise<string> {
    const customer = await this.#stripe.customers.create(
      { email, name, metadata: { userId } },
      { idempotencyKey: `customer-${userId}` },
    );
    return customer.id;
  }

  async createCheckoutSession(
    request: CheckoutSessionRequest,
  ): Promise<{ id: string; url: string }> {
    const session = await this.#stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer: request.customerId,
        client_reference_id: request.orderId,
        metadata: { orderId: request.orderId, userId: request.userId },
        line_items: request.lines.map(({ name, unitPrice, quantity }) => ({
          quantity,
          price_data: {
            currency: unitPrice.currency.toLowerCase(),
            unit_amount: unitPrice.amountCents,
            product_data: { name },
          },
        })),
        payment_method_types: ["card"],
        saved_payment_method_options: {
          payment_method_save: "enabled",
          allow_redisplay_filters: ["always", "limited", "unspecified"],
        },
        locale: request.locale,
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_TTL_SECONDS,
      },
      { idempotencyKey: `checkout-${request.orderId}` },
    );
    if (session.url === null) {
      throw new Error(`Stripe returned no URL for checkout session ${session.id}`);
    }
    return { id: session.id, url: session.url };
  }

  async createSetupSession({
    customerId,
    locale,
    returnUrl,
  }: SetupSessionRequest): Promise<string> {
    const session = await this.#stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      currency: "eur",
      payment_method_types: ["card"],
      locale,
      success_url: returnUrl,
      cancel_url: returnUrl,
    });
    if (session.url === null) {
      throw new Error(`Stripe returned no URL for setup session ${session.id}`);
    }
    return session.url;
  }

  async listCards(customerId: string): Promise<SavedCard[]> {
    const { data } = await this.#stripe.customers.listPaymentMethods(customerId, {
      type: "card",
      limit: 100,
    });
    return data.flatMap(({ id, card }) =>
      card
        ? [
            {
              id,
              brand: card.brand,
              last4: card.last4,
              expMonth: card.exp_month,
              expYear: card.exp_year,
            },
          ]
        : [],
    );
  }

  async findCardOwner(paymentMethodId: string): Promise<string | undefined> {
    try {
      const { customer } = await this.#stripe.paymentMethods.retrieve(paymentMethodId);
      return typeof customer === "string" ? customer : customer?.id;
    } catch (error) {
      if (error instanceof Stripe.errors.StripeInvalidRequestError && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async detachCard(paymentMethodId: string): Promise<void> {
    await this.#stripe.paymentMethods.detach(paymentMethodId);
  }

  parseEvent(payload: string | Uint8Array, signature: string): GatewayEvent {
    let event: Stripe.Event;
    try {
      event = this.#stripe.webhooks.constructEvent(payload, signature, this.#webhookSecret);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        throw new DomainError("INVALID_WEBHOOK_SIGNATURE", "Invalid Stripe webhook signature");
      }
      throw error;
    }
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") {
      const session = event.data.object;
      const orderId = session.client_reference_id;
      if (session.mode === "payment" && orderId !== null) {
        if (event.type === "checkout.session.expired") {
          return { id: event.id, kind: "CHECKOUT_EXPIRED", orderId };
        }
        if (session.payment_status === "paid") {
          return { id: event.id, kind: "CHECKOUT_PAID", orderId };
        }
      }
    }
    return { id: event.id, kind: "IGNORED" };
  }
}
