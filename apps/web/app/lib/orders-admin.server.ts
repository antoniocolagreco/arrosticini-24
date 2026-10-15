import { IdDto, orderingContract } from "@arrosticini/contracts";
import { ORPCError } from "@orpc/client";
import { data, type RouterContextProvider, redirect } from "react-router";
import { type AddressFormResult, parseAddress, readAddressValues } from "./addresses.server.js";
import { api } from "./api.server.js";
import { requireAdmin } from "./catalog-admin.server.js";
import { type AuthSessionData, assertSameOrigin } from "./session.server.js";

export interface OrderAdminResult extends AddressFormResult {
  intent: "address" | "ship" | "close";
  error: string | null;
}

const INTENTS: readonly OrderAdminResult["intent"][] = ["address", "ship", "close"];

const SHIPMENT_HINTS: Record<string, string> = {
  carrier: "carrierHint",
  trackingNumber: "trackingNumberHint",
  trackingUrl: "trackingUrlHint",
};

const API_ERRORS: Record<string, string> = {
  ORDER_NOT_EDITABLE: "orderNotEditable",
  ORDER_INVALID_TRANSITION: "orderInvalidTransition",
};

export async function orderAdminAction(
  request: Request,
  context: Readonly<RouterContextProvider>,
  locale: "it" | "en",
  id: string | undefined,
) {
  assertSameOrigin(request);
  const admin: AuthSessionData = requireAdmin(context, locale);
  const client = api(request, { userId: admin.userId, role: admin.role });
  const form: FormData = await request.formData();
  const intent = INTENTS.find((candidate) => candidate === form.get("intent"));
  const orderId = IdDto.safeParse(id);
  const field = (name: string): string => {
    const value: FormDataEntryValue | null = form.get(name);
    return typeof value === "string" ? value : "";
  };
  const values: Record<string, string> =
    intent === "ship"
      ? {
          carrier: field("carrier"),
          trackingNumber: field("trackingNumber"),
          trackingUrl: field("trackingUrl"),
        }
      : readAddressValues(form);
  const result: OrderAdminResult = { intent: intent ?? "address", values, errors: {}, error: null };
  if (!intent || !orderId.success)
    return data<OrderAdminResult>({ ...result, error: "invalidForm" }, { status: 400 });
  const saved = (name: string) =>
    redirect(`/${locale}/admin/orders/${orderId.data}?saved=${name}`, { status: 303 });
  try {
    if (intent === "address") {
      const parsed = parseAddress(values);
      if (!parsed.data)
        return data<OrderAdminResult>({ ...result, errors: parsed.errors }, { status: 400 });
      const { isDefault: _isDefault, ...address } = parsed.data;
      await client.ordering.changeShippingAddress({ id: orderId.data, ...address });
      return saved("address");
    }
    if (intent === "ship") {
      const schema = orderingContract.shipOrder["~orpc"].inputSchema;
      if (!schema) throw new Error("Ordering input schema is missing");
      const input = schema.safeParse({
        id: orderId.data,
        carrier: values.carrier,
        trackingNumber: values.trackingNumber?.trim() || undefined,
        trackingUrl: values.trackingUrl?.trim() || undefined,
      });
      if (!input.success) {
        const errors: Record<string, string> = {};
        for (const issue of input.error.issues) {
          const name = String(issue.path[0]);
          errors[name] = SHIPMENT_HINTS[name] ?? "invalidForm";
        }
        return data<OrderAdminResult>({ ...result, errors }, { status: 400 });
      }
      await client.ordering.shipOrder(input.data);
      return saved("shipment");
    }
    const status: FormDataEntryValue | null = form.get("status");
    if (status !== "DELIVERED" && status !== "LOST")
      return data<OrderAdminResult>({ ...result, error: "invalidForm" }, { status: 400 });
    await client.ordering.closeOrder({ id: orderId.data, status });
    return saved(status.toLowerCase());
  } catch (error: unknown) {
    if (!(error instanceof ORPCError)) throw error;
    if (error.code === "ORDER_NOT_FOUND") throw new Response(null, { status: 404 });
    const message: string | undefined = API_ERRORS[error.code];
    if (!message) throw error;
    return data<OrderAdminResult>({ ...result, error: message }, { status: error.status });
  }
}
