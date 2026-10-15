import type { PaymentInitiator } from "@arrosticini/ordering";
import type { StartCheckout } from "@arrosticini/payments";

export function paymentsInitiator(startCheckout: StartCheckout): PaymentInitiator {
  return {
    start: (actor, { orderId, lines, locale, returnUrl }) =>
      startCheckout.execute(actor, {
        orderId,
        lines,
        locale,
        successUrl: returnUrl,
        cancelUrl: returnUrl,
      }),
  };
}
