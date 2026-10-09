import { paymentsContract } from "@arrosticini/contracts";
import { ORPCError } from "@orpc/client";
import { data, type RouterContextProvider, redirect } from "react-router";
import { api } from "./api.server.js";
import { assertSameOrigin, requireUser } from "./session.server.js";

export interface PaymentMethodResult {
  error: "invalidPaymentMethod" | "paymentMethodMissing" | null;
}

export async function paymentMethodsAction(
  request: Request,
  context: Readonly<RouterContextProvider>,
  locale: "it" | "en",
) {
  assertSameOrigin(request);
  const user = requireUser(context, locale);
  const client = api(request, { userId: user.userId, role: user.role });
  const form: FormData = await request.formData();
  if (form.get("intent") === "setup") {
    const returnUrl: string = new URL(
      `/${locale}/account/payment-methods`,
      process.env.PUBLIC_ORIGIN ?? request.url,
    ).href;
    const result = await client.payments.createSetupSession({ returnUrl, locale });
    return redirect(result.url, { status: 303 });
  }
  const schema = paymentsContract.deletePaymentMethod["~orpc"].inputSchema;
  if (!schema) throw new Error("Payments input schema is missing");
  const input = schema.safeParse({ id: form.get("id") });
  if (form.get("intent") !== "delete" || !input.success)
    return data<PaymentMethodResult>({ error: "invalidPaymentMethod" }, { status: 400 });
  try {
    await client.payments.deletePaymentMethod(input.data);
    return data<PaymentMethodResult>({ error: null });
  } catch (error: unknown) {
    if (error instanceof ORPCError && error.code === "PAYMENT_METHOD_NOT_FOUND")
      return data<PaymentMethodResult>({ error: "paymentMethodMissing" }, { status: 404 });
    throw error;
  }
}
