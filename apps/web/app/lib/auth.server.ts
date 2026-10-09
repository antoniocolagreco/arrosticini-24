import { identityContract, type UserDto } from "@arrosticini/contracts";
import { data, type RouterContextProvider, redirect } from "react-router";
import { z } from "zod";
import { api, getApiError } from "./api.server.js";
import { assertSameOrigin, loginSession, sessionContext } from "./session.server.js";

export interface AuthResult {
  values: { email: string; firstName: string; lastName: string };
  errors: Partial<Record<"email" | "password" | "firstName" | "lastName", string>>;
  error: string | null;
}

export function guestOnly(context: Readonly<RouterContextProvider>, locale: string): null {
  if (context.get(sessionContext).has("userId")) throw redirect(`/${locale}/account`);
  return null;
}

export async function authenticate(
  request: Request,
  context: Readonly<RouterContextProvider>,
  locale: "it" | "en",
  register: boolean,
) {
  assertSameOrigin(request);
  const form: FormData = await request.formData();
  const field = (name: string): string => {
    const value: FormDataEntryValue | null = form.get(name);
    return typeof value === "string" ? value : "";
  };
  const values: AuthResult["values"] = {
    email: field("email"),
    firstName: field("firstName"),
    lastName: field("lastName"),
  };
  const password: FormDataEntryValue | null = form.get("password");
  const registrationSchema = identityContract.registerUser["~orpc"].inputSchema;
  const credentialsSchema = identityContract.verifyCredentials["~orpc"].inputSchema;
  if (!registrationSchema || !credentialsSchema)
    throw new Error("Identity input schemas are missing");
  const parseInput = () =>
    register
      ? {
          kind: "register" as const,
          input: registrationSchema.parse({ ...values, password, preferredLocale: locale }),
        }
      : {
          kind: "login" as const,
          input: credentialsSchema.parse({ email: values.email, password }),
        };
  let parsed: ReturnType<typeof parseInput>;
  try {
    parsed = parseInput();
  } catch (error: unknown) {
    if (!(error instanceof z.ZodError)) throw error;
    const errors: AuthResult["errors"] = {};
    for (const issue of error.issues) {
      if (issue.path[0] === "email") errors.email = "emailHint";
      if (issue.path[0] === "firstName") errors.firstName = "firstNameHint";
      if (issue.path[0] === "lastName") errors.lastName = "lastNameHint";
      if (issue.path[0] === "password")
        errors.password = register ? "passwordHint" : "passwordRequired";
    }
    return data<AuthResult>({ values, errors, error: null }, { status: 400 });
  }
  try {
    const user: UserDto =
      parsed.kind === "register"
        ? await api(request).identity.registerUser(parsed.input)
        : await api(request).identity.verifyCredentials(parsed.input);
    return redirect(`/${locale}/account`, {
      status: 303,
      headers: { "Set-Cookie": await loginSession(context, user) },
    });
  } catch (error: unknown) {
    const code: ReturnType<typeof getApiError> = getApiError(error);
    if (code === "EMAIL_TAKEN")
      return data<AuthResult>(
        { values, errors: { email: "emailTaken" }, error: null },
        { status: 409 },
      );
    if (code === "INVALID_CREDENTIALS")
      return data<AuthResult>({ values, errors: {}, error: "invalidCredentials" }, { status: 401 });
    if (code === "BAD_REQUEST")
      return data<AuthResult>({ values, errors: {}, error: "invalidForm" }, { status: 400 });
    throw error;
  }
}
