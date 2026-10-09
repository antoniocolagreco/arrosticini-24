import type { PaymentCustomerRepository } from "../domain/payment-customer-repository.js";
import type { Actor } from "./actor.js";
import type { CustomerProfiles, PaymentGateway } from "./ports.js";

export interface StripeCustomerDeps {
  customers: PaymentCustomerRepository;
  profiles: CustomerProfiles;
  gateway: PaymentGateway;
}

export async function ensureStripeCustomer(
  { customers, profiles, gateway }: StripeCustomerDeps,
  actor: Actor,
): Promise<string> {
  const existing = await customers.findStripeCustomerId(actor.userId);
  if (existing !== undefined) {
    return existing;
  }
  const profile = await profiles.find(actor);
  const created = await gateway.createCustomer({ userId: actor.userId, ...profile });
  await customers.save(actor.userId, created);
  return created;
}
