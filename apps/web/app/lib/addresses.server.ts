import { IdDto, identityContract } from "@arrosticini/contracts";
import { ORPCError } from "@orpc/client";
import { data, type RouterContextProvider, redirect } from "react-router";
import { api } from "./api.server.js";
import { assertSameOrigin, requireUser } from "./session.server.js";

export interface AddressFormResult {
  values: Record<string, string>;
  errors: Record<string, string>;
}

export interface AddressResult extends AddressFormResult {
  intent: "add" | "update" | "delete" | "default";
  id: string | null;
  error: string | null;
}

const ADDRESS_FIELDS: readonly string[] = [
  "fullName",
  "line1",
  "line2",
  "city",
  "postalCode",
  "country",
  "phone",
];

const INTENTS: readonly AddressResult["intent"][] = ["add", "update", "delete", "default"];

export function readAddressValues(form: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of ADDRESS_FIELDS) {
    const value: FormDataEntryValue | null = form.get(field);
    values[field] = typeof value === "string" ? value : "";
  }
  return values;
}

export function parseAddress(values: Record<string, string>) {
  const schema = identityContract.addAddress["~orpc"].inputSchema;
  if (!schema) throw new Error("Identity input schema is missing");
  const input = schema.safeParse({
    ...values,
    line2: values.line2?.trim() || undefined,
    country: values.country?.trim().toUpperCase(),
  });
  if (input.success) return { data: input.data, errors: null };
  const errors: Record<string, string> = {};
  for (const issue of input.error.issues)
    errors[String(issue.path[0])] =
      issue.path[0] === "country" ? "chooseCountry" : "addressFieldHint";
  return { data: null, errors };
}

export async function addressesAction(
  request: Request,
  context: Readonly<RouterContextProvider>,
  locale: "it" | "en",
) {
  assertSameOrigin(request);
  const user = requireUser(context, locale);
  const client = api(request, { userId: user.userId, role: user.role });
  const form: FormData = await request.formData();
  const intent = INTENTS.find((candidate) => candidate === form.get("intent"));
  const id = IdDto.safeParse(form.get("id"));
  const values: Record<string, string> = readAddressValues(form);
  const result: AddressResult = {
    intent: intent ?? "add",
    id: id.success ? id.data : null,
    values,
    errors: {},
    error: null,
  };
  const invalid = () =>
    data<AddressResult>({ ...result, error: "invalidAddress" }, { status: 400 });
  if (!intent) return invalid();
  try {
    if (intent === "add" || intent === "update") {
      const parsed = parseAddress(values);
      if (!parsed.data)
        return data<AddressResult>({ ...result, errors: parsed.errors }, { status: 400 });
      if (intent === "add") await client.identity.addAddress(parsed.data);
      else if (id.success) {
        const { fullName, line1, line2, city, postalCode, country, phone } = parsed.data;
        await client.identity.updateAddress({
          id: id.data,
          fullName,
          line1,
          line2: line2 ?? null,
          city,
          postalCode,
          country,
          phone,
        });
      } else return invalid();
    } else if (!id.success) return invalid();
    else if (intent === "delete") await client.identity.deleteAddress({ id: id.data });
    else await client.identity.updateAddress({ id: id.data, isDefault: true });
    return redirect(`/${locale}/account/addresses`, { status: 303 });
  } catch (error: unknown) {
    if (!(error instanceof ORPCError)) throw error;
    const errors: Record<string, string> = {
      ADDRESS_NOT_FOUND: "addressMissing",
      ADDRESS_LIMIT_REACHED: "addressLimit",
    };
    const message: string | undefined = errors[error.code];
    if (!message) throw error;
    return data<AddressResult>({ ...result, error: message }, { status: error.status });
  }
}
