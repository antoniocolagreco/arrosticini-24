import { DomainError, type Locale } from "@arrosticini/kernel";
import { type Actor, requireActor } from "./actor.js";
import type { SavedCard } from "./ports.js";
import { ensureStripeCustomer, type StripeCustomerDeps } from "./stripe-customer.js";

export class ListPaymentMethods {
  readonly #deps: StripeCustomerDeps;

  constructor(deps: StripeCustomerDeps) {
    this.#deps = deps;
  }

  async execute(actor: Actor | undefined): Promise<SavedCard[]> {
    const customerId = await this.#deps.customers.findStripeCustomerId(requireActor(actor).userId);
    return customerId === undefined ? [] : this.#deps.gateway.listCards(customerId);
  }
}

export interface CreateSetupSessionCommand {
  returnUrl: string;
  locale: Locale;
}

export class CreateSetupSession {
  readonly #deps: StripeCustomerDeps;

  constructor(deps: StripeCustomerDeps) {
    this.#deps = deps;
  }

  async execute(
    actor: Actor | undefined,
    { returnUrl, locale }: CreateSetupSessionCommand,
  ): Promise<string> {
    const customerId = await ensureStripeCustomer(this.#deps, requireActor(actor));
    return this.#deps.gateway.createSetupSession({ customerId, locale, returnUrl });
  }
}

export class DeletePaymentMethod {
  readonly #deps: StripeCustomerDeps;

  constructor(deps: StripeCustomerDeps) {
    this.#deps = deps;
  }

  async execute(actor: Actor | undefined, paymentMethodId: string): Promise<void> {
    const customerId = await this.#deps.customers.findStripeCustomerId(requireActor(actor).userId);
    if (
      customerId === undefined ||
      (await this.#deps.gateway.findCardOwner(paymentMethodId)) !== customerId
    ) {
      throw new DomainError(
        "PAYMENT_METHOD_NOT_FOUND",
        `Payment method not found: ${paymentMethodId}`,
      );
    }
    await this.#deps.gateway.detachCard(paymentMethodId);
  }
}
