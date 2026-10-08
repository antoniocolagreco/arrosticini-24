import { Password, type UserDto, Username } from "@arrosticini/contracts";
import { data, type RouterContextProvider, redirect } from "react-router";
import { z } from "zod";
import { api, getApiError } from "./api.server.js";
import { assertSameOrigin, loginSession, sessionContext } from "./session.server.js";

export interface AuthResult {
  values: { username: string };
  errors: Partial<Record<"username" | "password", string>>;
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
  const username: string =
    typeof form.get("username") === "string" ? String(form.get("username")) : "";
  const password: FormDataEntryValue | null = form.get("password");
  const schema = z.object({
    username: Username,
    password: register ? Password : z.string().min(1).max(128),
  });
  const parsed = schema.safeParse({ username, password });
  const values: AuthResult["values"] = { username };
  if (!parsed.success) {
    const errors: AuthResult["errors"] = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === "username") errors.username = "usernameHint";
      if (issue.path[0] === "password")
        errors.password = register ? "passwordHint" : "passwordRequired";
    }
    return data<AuthResult>({ values, errors, error: null }, { status: 400 });
  }
  try {
    const user: UserDto = register
      ? await api(request).identity.registerUser({ ...parsed.data, preferredLocale: locale })
      : await api(request).identity.verifyCredentials(parsed.data);
    return redirect(`/${locale}/account`, {
      status: 303,
      headers: { "Set-Cookie": await loginSession(context, user) },
    });
  } catch (error: unknown) {
    const code: ReturnType<typeof getApiError> = getApiError(error);
    if (code === "USERNAME_TAKEN")
      return data<AuthResult>(
        { values, errors: { username: "usernameTaken" }, error: null },
        { status: 409 },
      );
    if (code === "INVALID_CREDENTIALS")
      return data<AuthResult>({ values, errors: {}, error: "invalidCredentials" }, { status: 401 });
    if (code === "BAD_REQUEST")
      return data<AuthResult>({ values, errors: {}, error: "invalidForm" }, { status: 400 });
    throw error;
  }
}
