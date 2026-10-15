import { DomainError } from "@arrosticini/kernel";
import type { HandleStripeEvent } from "@arrosticini/payments";
import type { RequestHandler } from "express";

export function stripeWebhook(handleStripeEvent: HandleStripeEvent): RequestHandler {
  return async (req, res) => {
    const signature = req.headers["stripe-signature"];
    try {
      if (typeof signature !== "string" || !Buffer.isBuffer(req.body)) {
        throw new DomainError("INVALID_WEBHOOK_SIGNATURE", "Missing Stripe webhook signature");
      }
      await handleStripeEvent.execute(req.body, signature);
      res.json({ received: true });
    } catch (error) {
      if (error instanceof DomainError && error.code === "INVALID_WEBHOOK_SIGNATURE") {
        res
          .status(400)
          .json({ defined: false, code: error.code, status: 400, message: error.message });
        return;
      }
      req.log.error({ err: error }, "stripe webhook failed");
      res.status(500).json({
        defined: false,
        code: "INTERNAL_SERVER_ERROR",
        status: 500,
        message: "Internal server error",
      });
    }
  };
}
