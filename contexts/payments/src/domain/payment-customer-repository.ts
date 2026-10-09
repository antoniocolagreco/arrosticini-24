import type { Id } from "@arrosticini/kernel";

export interface PaymentCustomerRepository {
  findStripeCustomerId(userId: Id): Promise<string | undefined>;
  save(userId: Id, stripeCustomerId: string): Promise<void>;
}
