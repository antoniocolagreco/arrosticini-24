import { DomainError, Money } from "@arrosticini/kernel";
import Stripe from "stripe";
import { describe, expect, inject, it } from "vitest";
import { StripePaymentGateway } from "./stripe-payment-gateway.js";

const { host, port } = inject("stripeMock");
const stripe = new Stripe("sk_test_arrosticini", { host, port, protocol: "http" });
const webhookSecret = "whsec_arrosticini";
const gateway = new StripePaymentGateway(stripe, webhookSecret);

function signed(event: object) {
  const payload = JSON.stringify(event);
  return {
    payload: Buffer.from(payload),
    signature: stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret }),
  };
}

function sessionEvent(type: string, session: object) {
  return signed({
    id: "evt_test_1",
    object: "event",
    type,
    data: { object: { id: "cs_test_a1", object: "checkout.session", ...session } },
  });
}

describe("StripePaymentGateway", () => {
  it("creates customers, checkout and setup sessions", async () => {
    const customerId = await gateway.createCustomer({
      userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
      email: "mario.rossi@example.com",
      name: "Mario Rossi",
    });
    const checkout = await gateway.createCheckoutSession({
      orderId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
      customerId,
      lines: [{ name: "Arrosticini classici", unitPrice: Money.ofCents(2990), quantity: 2 }],
      locale: "it",
      successUrl: "https://shop.test/it/orders/01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      cancelUrl: "https://shop.test/it/orders/01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    });
    const setupUrl = await gateway.createSetupSession({
      customerId,
      locale: "en",
      returnUrl: "https://shop.test/en/account/payment-methods",
    });

    expect(customerId).toMatch(/^cus_/);
    expect(checkout.id).toMatch(/^cs_/);
    expect(checkout.url).toMatch(/^https:\/\//);
    expect(setupUrl).toMatch(/^https:\/\//);
  });

  it("lists saved cards", async () => {
    const cards = await gateway.listCards("cus_test");

    expect(cards.length).toBeGreaterThan(0);
    expect(cards).toEqual(
      cards.map(() => ({
        id: expect.stringMatching(/^pm_/),
        brand: expect.any(String),
        last4: expect.stringMatching(/^\d{4}$/),
        expMonth: expect.any(Number),
        expYear: expect.any(Number),
      })),
    );
  });

  it("reads a paid checkout as CHECKOUT_PAID", () => {
    const { payload, signature } = sessionEvent("checkout.session.completed", {
      mode: "payment",
      payment_status: "paid",
      client_reference_id: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    });

    expect(gateway.parseEvent(payload, signature)).toEqual({
      id: "evt_test_1",
      kind: "CHECKOUT_PAID",
      orderId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    });
  });

  it("reads an expired checkout as CHECKOUT_EXPIRED", () => {
    const { payload, signature } = sessionEvent("checkout.session.expired", {
      mode: "payment",
      payment_status: "unpaid",
      client_reference_id: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    });

    expect(gateway.parseEvent(payload, signature)).toEqual({
      id: "evt_test_1",
      kind: "CHECKOUT_EXPIRED",
      orderId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    });
  });

  it.each([
    [
      "an unpaid checkout",
      "checkout.session.completed",
      {
        mode: "payment",
        payment_status: "unpaid",
        client_reference_id: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      },
    ],
    [
      "a completed card setup",
      "checkout.session.completed",
      { mode: "setup", payment_status: "no_payment_required", client_reference_id: null },
    ],
    ["another event type", "customer.created", {}],
  ])("ignores %s", (_case, type, session) => {
    const { payload, signature } = sessionEvent(type, session);

    expect(gateway.parseEvent(payload, signature)).toEqual({ id: "evt_test_1", kind: "IGNORED" });
  });

  it("rejects a forged or tampered event", () => {
    const { payload, signature } = sessionEvent("checkout.session.completed", {
      mode: "payment",
      payment_status: "paid",
      client_reference_id: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    });
    const tampered = Buffer.from(payload.toString().replace("V0A", "V0B"));

    for (const [body, header] of [
      [payload, "t=1,v1=forged"],
      [tampered, signature],
    ] as const) {
      expect(() => gateway.parseEvent(body, header)).toThrow(
        new DomainError("INVALID_WEBHOOK_SIGNATURE", "Invalid Stripe webhook signature"),
      );
    }
  });
});
