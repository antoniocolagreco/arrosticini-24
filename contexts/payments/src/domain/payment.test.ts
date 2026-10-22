import { DomainError, Money } from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { Payment } from "./payment.js";

const started = new Date("2026-10-09T10:00:00.000Z");
const settled = new Date("2026-10-09T10:05:00.000Z");
const later = new Date("2026-10-09T10:09:00.000Z");

function payment(): Payment {
  return Payment.start(
    {
      orderId: "0192e1a0-0000-7000-8000-000000000007",
      userId: "0192e1a0-0000-7000-8000-000000000013",
      stripeSessionId: "cs_test_a1",
      amount: Money.ofCents(6870),
    },
    started,
  );
}

describe("Payment", () => {
  it("starts pending", () => {
    const target = payment();

    expect(target.status).toBe("PENDING");
    expect(target.createdAt).toEqual(started);
    expect(target.updatedAt).toEqual(started);
  });

  it("succeeds once and ignores a repeated success", () => {
    const target = payment();

    target.succeed(settled);
    target.succeed(later);

    expect(target.status).toBe("SUCCEEDED");
    expect(target.updatedAt).toEqual(settled);
  });

  it("expires once and ignores a repeated expiry", () => {
    const target = payment();

    target.expire(settled);
    target.expire(later);

    expect(target.status).toBe("EXPIRED");
    expect(target.updatedAt).toEqual(settled);
  });

  it("cannot expire after success or succeed after expiry", () => {
    const succeeded = payment();
    succeeded.succeed(settled);
    const expired = payment();
    expired.expire(settled);

    expect(() => succeeded.expire(later)).toThrow(
      new DomainError(
        "PAYMENT_INVALID_TRANSITION",
        "Payment of order 0192e1a0-0000-7000-8000-000000000007 cannot go from SUCCEEDED to EXPIRED",
      ),
    );
    expect(() => expired.succeed(later)).toThrow(
      new DomainError(
        "PAYMENT_INVALID_TRANSITION",
        "Payment of order 0192e1a0-0000-7000-8000-000000000007 cannot go from EXPIRED to SUCCEEDED",
      ),
    );
  });
});
