import {
  domainEvent,
  type EventBus,
  type Id,
  type Locale,
  type LocalizedText,
  Money,
} from "@arrosticini/kernel";
import type { PaymentSettledPayload } from "../domain/events.js";
import { Payment } from "../domain/payment.js";
import type { PaymentRepository } from "../domain/payment-repository.js";
import type { ProcessedEventRepository } from "../domain/processed-event-repository.js";
import type { Actor } from "./actor.js";
import type { PaymentGateway } from "./ports.js";
import { ensureStripeCustomer, type StripeCustomerDeps } from "./stripe-customer.js";

export interface StartCheckoutCommand {
  orderId: Id;
  lines: readonly { name: LocalizedText; unitPrice: Money; quantity: number }[];
  locale: Locale;
  successUrl: string;
  cancelUrl: string;
}

export class StartCheckout {
  readonly #payments: PaymentRepository;
  readonly #deps: StripeCustomerDeps;

  constructor(payments: PaymentRepository, deps: StripeCustomerDeps) {
    this.#payments = payments;
    this.#deps = deps;
  }

  async execute(actor: Actor, command: StartCheckoutCommand): Promise<string> {
    const { orderId, lines, locale, successUrl, cancelUrl } = command;
    const customerId = await ensureStripeCustomer(this.#deps, actor);
    const session = await this.#deps.gateway.createCheckoutSession({
      orderId,
      userId: actor.userId,
      customerId,
      lines: lines.map(({ name, unitPrice, quantity }) => ({
        name: name[locale],
        unitPrice,
        quantity,
      })),
      locale,
      successUrl,
      cancelUrl,
    });
    const amount = lines.reduce(
      (total, { unitPrice, quantity }) => total.add(unitPrice.multiply(quantity)),
      Money.ofCents(0),
    );
    await this.#payments.save(
      Payment.start(
        { orderId, userId: actor.userId, stripeSessionId: session.id, amount },
        new Date(),
      ),
    );
    return session.url;
  }
}

export class HandleStripeEvent {
  readonly #payments: PaymentRepository;
  readonly #processed: ProcessedEventRepository;
  readonly #gateway: PaymentGateway;
  readonly #bus: EventBus;

  constructor(
    payments: PaymentRepository,
    processed: ProcessedEventRepository,
    gateway: PaymentGateway,
    bus: EventBus,
  ) {
    this.#payments = payments;
    this.#processed = processed;
    this.#gateway = gateway;
    this.#bus = bus;
  }

  async execute(payload: string | Uint8Array, signature: string): Promise<void> {
    const event = this.#gateway.parseEvent(payload, signature);
    if (event.kind === "IGNORED" || (await this.#processed.has(event.id))) {
      return;
    }
    const now = new Date();
    const payment = await this.#payments.findByOrderId(event.orderId);
    if (payment !== undefined) {
      const settled: PaymentSettledPayload = {
        orderId: payment.orderId,
        userId: payment.userId,
      };
      if (event.kind === "CHECKOUT_PAID") {
        payment.succeed(now);
        await this.#payments.save(payment);
        await this.#bus.publish([domainEvent("PaymentSucceeded", settled)]);
      } else {
        payment.expire(now);
        await this.#payments.save(payment);
        await this.#bus.publish([domainEvent("PaymentExpired", settled)]);
      }
    }
    await this.#processed.add(event.id, now);
  }
}
