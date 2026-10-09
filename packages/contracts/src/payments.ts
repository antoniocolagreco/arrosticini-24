import { z } from "zod";
import { authed, LocaleDto } from "./common.js";

export const PaymentMethodDto = z.object({
  id: z.string(),
  brand: z.string(),
  last4: z.string().length(4),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int(),
});

export type PaymentMethodDto = z.infer<typeof PaymentMethodDto>;

export const listPaymentMethods = authed
  .route({ method: "GET", path: "/payments/methods" })
  .output(z.object({ items: z.array(PaymentMethodDto) }));

export const createSetupSession = authed
  .route({ method: "POST", path: "/payments/methods/setup-session", successStatus: 201 })
  .input(z.object({ returnUrl: z.url(), locale: LocaleDto }))
  .output(z.object({ url: z.url() }));

export const deletePaymentMethod = authed
  .route({ method: "DELETE", path: "/payments/methods/{id}", successStatus: 204 })
  .input(z.object({ id: z.string().min(1) }))
  .output(z.void())
  .errors({ PAYMENT_METHOD_NOT_FOUND: { status: 404 } });

export const paymentsContract = {
  listPaymentMethods,
  createSetupSession,
  deletePaymentMethod,
};
