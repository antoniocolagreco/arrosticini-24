import { identityContract, orderingContract } from "@arrosticini/contracts";
import { ORPCError } from "@orpc/client";
import { data, type RouterContextProvider, redirect } from "react-router";
import { api } from "./api.server.js";
import { assertSameOrigin, requireUser, sessionContext } from "./session.server.js";

export interface CheckoutResult {
  kind: "address" | "order";
  values: Record<string, string>;
  errors: Record<string, string>;
  error: string | null;
}

export async function checkoutAction(
  request: Request,
  context: Readonly<RouterContextProvider>,
  locale: "it" | "en",
) {
  assertSameOrigin(request);
  const user = requireUser(context, locale);
  const client = api(request, { userId: user.userId, role: user.role });
  const form: FormData = await request.formData();
  const values: Record<string, string> = {};
  for (const field of ["fullName", "line1", "line2", "city", "postalCode", "country", "phone"]) {
    const value: FormDataEntryValue | null = form.get(field);
    values[field] = typeof value === "string" ? value : "";
  }
  const kind: "address" | "order" = form.get("intent") === "address" ? "address" : "order";
  const result: CheckoutResult = { kind, values, errors: {}, error: null };
  if (kind === "address") {
    const schema = identityContract.addAddress["~orpc"].inputSchema;
    if (!schema) throw new Error("Identity input schema is missing");
    const input = schema.safeParse({
      ...values,
      line2: values.line2?.trim() || undefined,
      country: values.country?.trim().toUpperCase(),
    });
    if (!input.success) {
      for (const issue of input.error.issues)
        result.errors[String(issue.path[0])] =
          issue.path[0] === "country" ? "countryHint" : "addressFieldHint";
      return data<CheckoutResult>(result, { status: 400 });
    }
    try {
      await client.identity.addAddress(input.data);
      return redirect(`/${locale}/checkout`, { status: 303 });
    } catch (error: unknown) {
      if (error instanceof ORPCError && error.code === "ADDRESS_LIMIT_REACHED")
        return data<CheckoutResult>({ ...result, error: "addressLimit" }, { status: 409 });
      throw error;
    }
  }
  if (form.get("intent") !== "order")
    return data<CheckoutResult>({ ...result, error: "invalidCheckout" }, { status: 400 });
  const cartId: string | undefined = context.get(sessionContext).get("cartId");
  if (!cartId) return data<CheckoutResult>({ ...result, error: "emptyCart" }, { status: 422 });
  const schema = orderingContract.placeOrder["~orpc"].inputSchema;
  if (!schema) throw new Error("Ordering input schema is missing");
  const input = schema.safeParse({
    cartId,
    addressId: form.get("addressId"),
    locale,
    ordersUrl: new URL(`/${locale}/orders`, process.env.PUBLIC_ORIGIN ?? request.url).href,
  });
  if (!input.success)
    return data<CheckoutResult>({ ...result, error: "chooseAddress" }, { status: 400 });
  try {
    const placed = await client.ordering.placeOrder(input.data);
    return redirect(placed.paymentUrl, { status: 303 });
  } catch (error: unknown) {
    if (!(error instanceof ORPCError)) throw error;
    const errors: Record<string, string> = {
      CART_NOT_FOUND: "cartExpired",
      CART_EMPTY: "emptyCart",
      ADDRESS_NOT_FOUND: "addressMissing",
      PRODUCT_UNAVAILABLE: "unavailableCart",
    };
    const message: string | undefined = errors[error.code];
    if (!message) throw error;
    return data<CheckoutResult>({ ...result, error: message }, { status: error.status });
  }
}
