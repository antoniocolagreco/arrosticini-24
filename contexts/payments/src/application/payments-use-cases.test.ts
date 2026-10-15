import {
  DomainError,
  type DomainEvent,
  type EventBus,
  type Id,
  localizedText,
  Money,
} from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { Payment } from "../domain/payment.js";
import type { PaymentCustomerRepository } from "../domain/payment-customer-repository.js";
import type { PaymentRepository } from "../domain/payment-repository.js";
import type { ProcessedEventRepository } from "../domain/processed-event-repository.js";
import type { Actor } from "./actor.js";
import { HandleStripeEvent, StartCheckout } from "./checkout.js";
import { CreateSetupSession, DeletePaymentMethod, ListPaymentMethods } from "./payment-methods.js";
import type {
  CheckoutSessionRequest,
  CustomerProfiles,
  GatewayEvent,
  PaymentGateway,
  SavedCard,
  SetupSessionRequest,
} from "./ports.js";

class InMemoryPaymentRepository implements PaymentRepository {
  readonly payments = new Map<Id, Payment>();

  async findByOrderId(orderId: Id) {
    return this.payments.get(orderId);
  }

  async save(payment: Payment) {
    this.payments.set(payment.orderId, payment);
  }
}

class InMemoryPaymentCustomerRepository implements PaymentCustomerRepository {
  readonly customers = new Map<Id, string>();

  async findStripeCustomerId(userId: Id) {
    return this.customers.get(userId);
  }

  async save(userId: Id, stripeCustomerId: string) {
    this.customers.set(userId, stripeCustomerId);
  }
}

class InMemoryProcessedEventRepository implements ProcessedEventRepository {
  readonly events = new Set<string>();

  async has(eventId: string) {
    return this.events.has(eventId);
  }

  async add(eventId: string) {
    this.events.add(eventId);
  }
}

class RecordingEventBus implements EventBus {
  readonly published: DomainEvent[] = [];

  async publish(events: readonly DomainEvent[]) {
    this.published.push(...events);
  }

  subscribe() {}
}

class FakeGateway implements PaymentGateway {
  readonly createdCustomers: { userId: Id; email: string; name: string }[] = [];
  readonly checkoutSessions: CheckoutSessionRequest[] = [];
  readonly setupSessions: SetupSessionRequest[] = [];
  readonly detached: string[] = [];
  readonly cards: Record<string, SavedCard[]> = {
    cus_mario: [{ id: "pm_visa", brand: "visa", last4: "4242", expMonth: 12, expYear: 2034 }],
  };
  readonly owners: Record<string, string> = { pm_visa: "cus_mario", pm_lucia: "cus_lucia" };
  readonly events: Record<string, GatewayEvent> = {};

  async createCustomer(customer: { userId: Id; email: string; name: string }) {
    this.createdCustomers.push(customer);
    return `cus_${customer.name.split(" ")[0]?.toLowerCase()}`;
  }

  async createCheckoutSession(request: CheckoutSessionRequest) {
    this.checkoutSessions.push(request);
    return { id: "cs_test_a1", url: "https://checkout.stripe.test/c/pay/cs_test_a1" };
  }

  async createSetupSession(request: SetupSessionRequest) {
    this.setupSessions.push(request);
    return "https://checkout.stripe.test/c/setup/cs_test_s1";
  }

  async listCards(customerId: string) {
    return this.cards[customerId] ?? [];
  }

  async findCardOwner(paymentMethodId: string) {
    return this.owners[paymentMethodId];
  }

  async detachCard(paymentMethodId: string) {
    this.detached.push(paymentMethodId);
  }

  parseEvent(_payload: string | Uint8Array, signature: string): GatewayEvent {
    const event = this.events[signature];
    if (event === undefined) {
      throw new DomainError("INVALID_WEBHOOK_SIGNATURE", "Invalid Stripe webhook signature");
    }
    return event;
  }
}

const mario: Actor = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X", role: "customer" };

const profiles: CustomerProfiles = {
  find: async () => ({ email: "mario.rossi@example.com", name: "Mario Rossi" }),
};

function setup() {
  const gateway = new FakeGateway();
  const customers = new InMemoryPaymentCustomerRepository();
  const payments = new InMemoryPaymentRepository();
  const processed = new InMemoryProcessedEventRepository();
  const bus = new RecordingEventBus();
  const deps = { customers, profiles, gateway };
  return { gateway, customers, payments, processed, bus, deps };
}

function pendingPayment(payments: InMemoryPaymentRepository): Payment {
  const payment = Payment.start(
    {
      orderId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      userId: mario.userId,
      stripeSessionId: "cs_test_a1",
      amount: Money.ofCents(6870),
    },
    new Date("2026-10-09T10:00:00.000Z"),
  );
  payments.payments.set(payment.orderId, payment);
  return payment;
}

describe("StartCheckout", () => {
  it("creates the Stripe customer once, opens a localized session and records the payment", async () => {
    const { gateway, customers, payments, deps } = setup();
    const startCheckout = new StartCheckout(payments, deps);
    const command = {
      orderId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      lines: [
        {
          name: localizedText({ it: "Arrosticini classici", en: "Classic arrosticini" }),
          unitPrice: Money.ofCents(2990),
          quantity: 2,
        },
        {
          name: localizedText({ it: "Vino rosso", en: "Red wine" }),
          unitPrice: Money.ofCents(890),
          quantity: 1,
        },
      ],
      locale: "en" as const,
      successUrl: "https://shop.test/en/orders/01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      cancelUrl: "https://shop.test/en/orders/01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    };

    const url = await startCheckout.execute(mario, command);
    await startCheckout.execute(mario, command);

    expect(url).toBe("https://checkout.stripe.test/c/pay/cs_test_a1");
    expect(gateway.createdCustomers).toEqual([
      { userId: mario.userId, email: "mario.rossi@example.com", name: "Mario Rossi" },
    ]);
    expect(customers.customers.get(mario.userId)).toBe("cus_mario");
    expect(gateway.checkoutSessions[0]).toEqual({
      orderId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      userId: mario.userId,
      customerId: "cus_mario",
      lines: [
        { name: "Classic arrosticini", unitPrice: Money.ofCents(2990), quantity: 2 },
        { name: "Red wine", unitPrice: Money.ofCents(890), quantity: 1 },
      ],
      locale: "en",
      successUrl: "https://shop.test/en/orders/01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      cancelUrl: "https://shop.test/en/orders/01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    });
    const payment = payments.payments.get("01JB2Q7Z8X4M3N5P6R7S8T9V0A");
    expect(payment?.status).toBe("PENDING");
    expect(payment?.amount).toEqual(Money.ofCents(6870));
    expect(payment?.stripeSessionId).toBe("cs_test_a1");
    expect(payment?.userId).toBe(mario.userId);
  });
});

describe("HandleStripeEvent", () => {
  it("marks the payment as succeeded and publishes PaymentSucceeded once", async () => {
    const { gateway, payments, processed, bus } = setup();
    const payment = pendingPayment(payments);
    gateway.events.sig_paid = {
      id: "evt_paid",
      kind: "CHECKOUT_PAID",
      orderId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    };
    const handle = new HandleStripeEvent(payments, processed, gateway, bus);

    await handle.execute("{}", "sig_paid");
    await handle.execute("{}", "sig_paid");

    expect(payment.status).toBe("SUCCEEDED");
    expect(bus.published).toEqual([
      {
        id: expect.any(String),
        type: "PaymentSucceeded",
        occurredAt: expect.any(String),
        payload: { orderId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A", userId: mario.userId },
      },
    ]);
    expect(processed.events.has("evt_paid")).toBe(true);
  });

  it("publishes again when a retried event was not recorded as processed", async () => {
    const { gateway, payments, processed, bus } = setup();
    pendingPayment(payments).succeed(new Date("2026-10-09T10:05:00.000Z"));
    gateway.events.sig_paid = {
      id: "evt_paid",
      kind: "CHECKOUT_PAID",
      orderId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    };

    await new HandleStripeEvent(payments, processed, gateway, bus).execute("{}", "sig_paid");

    expect(bus.published.map(({ type }) => type)).toEqual(["PaymentSucceeded"]);
  });

  it("marks the payment as expired and publishes PaymentExpired", async () => {
    const { gateway, payments, processed, bus } = setup();
    const payment = pendingPayment(payments);
    gateway.events.sig_expired = {
      id: "evt_expired",
      kind: "CHECKOUT_EXPIRED",
      orderId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    };

    await new HandleStripeEvent(payments, processed, gateway, bus).execute("{}", "sig_expired");

    expect(payment.status).toBe("EXPIRED");
    expect(bus.published.map(({ type, payload }) => [type, payload])).toEqual([
      ["PaymentExpired", { orderId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A", userId: mario.userId }],
    ]);
  });

  it("ignores events it does not handle and payments it does not know", async () => {
    const { gateway, payments, processed, bus } = setup();
    gateway.events.sig_other = { id: "evt_other", kind: "IGNORED" };
    gateway.events.sig_unknown = {
      id: "evt_unknown",
      kind: "CHECKOUT_PAID",
      orderId: "01JB2Q7Z8X4M3N5P6R7S8T9V0B",
    };
    const handle = new HandleStripeEvent(payments, processed, gateway, bus);

    await handle.execute("{}", "sig_other");
    await handle.execute("{}", "sig_unknown");

    expect(bus.published).toEqual([]);
    expect([...processed.events]).toEqual(["evt_unknown"]);
  });

  it("rejects an invalid signature", async () => {
    const { gateway, payments, processed, bus } = setup();

    await expect(
      new HandleStripeEvent(payments, processed, gateway, bus).execute("{}", "forged"),
    ).rejects.toEqual(
      new DomainError("INVALID_WEBHOOK_SIGNATURE", "Invalid Stripe webhook signature"),
    );
  });
});

describe("ListPaymentMethods", () => {
  it("lists the saved cards of the customer", async () => {
    const { customers, deps } = setup();
    customers.customers.set(mario.userId, "cus_mario");

    expect(await new ListPaymentMethods(deps).execute(mario)).toEqual([
      { id: "pm_visa", brand: "visa", last4: "4242", expMonth: 12, expYear: 2034 },
    ]);
  });

  it("returns no cards before the Stripe customer exists", async () => {
    const { gateway, deps } = setup();

    expect(await new ListPaymentMethods(deps).execute(mario)).toEqual([]);
    expect(gateway.createdCustomers).toEqual([]);
  });

  it("requires a signed-in user", async () => {
    await expect(new ListPaymentMethods(setup().deps).execute(undefined)).rejects.toEqual(
      new DomainError("UNAUTHORIZED", "Authentication required"),
    );
  });
});

describe("CreateSetupSession", () => {
  it("opens a setup session for the customer, creating it if needed", async () => {
    const { gateway, deps } = setup();

    const url = await new CreateSetupSession(deps).execute(mario, {
      returnUrl: "https://shop.test/it/account/payment-methods",
      locale: "it",
    });

    expect(url).toBe("https://checkout.stripe.test/c/setup/cs_test_s1");
    expect(gateway.setupSessions).toEqual([
      {
        customerId: "cus_mario",
        locale: "it",
        returnUrl: "https://shop.test/it/account/payment-methods",
      },
    ]);
  });

  it("forbids admins", async () => {
    const { gateway, deps } = setup();

    await expect(
      new CreateSetupSession(deps).execute(
        { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Z", role: "admin" },
        { returnUrl: "https://shop.test/it/account/payment-methods", locale: "it" },
      ),
    ).rejects.toEqual(new DomainError("FORBIDDEN", "Admins cannot save payment methods"));
    expect(gateway.setupSessions).toEqual([]);
  });
});

describe("DeletePaymentMethod", () => {
  it("detaches a card of the customer", async () => {
    const { gateway, customers, deps } = setup();
    customers.customers.set(mario.userId, "cus_mario");

    await new DeletePaymentMethod(deps).execute(mario, "pm_visa");

    expect(gateway.detached).toEqual(["pm_visa"]);
  });

  it.each([
    ["a card of another customer", "pm_lucia"],
    ["an unknown card", "pm_missing"],
  ])("answers PAYMENT_METHOD_NOT_FOUND for %s", async (_case, id) => {
    const { gateway, customers, deps } = setup();
    customers.customers.set(mario.userId, "cus_mario");

    await expect(new DeletePaymentMethod(deps).execute(mario, id)).rejects.toEqual(
      new DomainError("PAYMENT_METHOD_NOT_FOUND", `Payment method not found: ${id}`),
    );
    expect(gateway.detached).toEqual([]);
  });

  it("answers PAYMENT_METHOD_NOT_FOUND before the Stripe customer exists", async () => {
    await expect(new DeletePaymentMethod(setup().deps).execute(mario, "pm_visa")).rejects.toEqual(
      new DomainError("PAYMENT_METHOD_NOT_FOUND", "Payment method not found: pm_visa"),
    );
  });
});
