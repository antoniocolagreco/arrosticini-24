import { identityContract } from "@arrosticini/contracts";
import { ORPCError } from "@orpc/client";
import { data, type RouterContextProvider, redirect } from "react-router";
import type { z } from "zod";
import { api } from "./api.server.js";
import {
  assertSameOrigin,
  requireUser,
  sessionContext,
  sessionStorageContext,
} from "./session.server.js";

export interface AccountResult {
  intent: "profile" | "password";
  values: { firstName: string; lastName: string; preferredLocale: string };
  errors: Record<string, string>;
  error: string | null;
}

const PROFILE_ERRORS: Record<string, string> = {
  firstName: "firstNameHint",
  lastName: "lastNameHint",
  preferredLocale: "chooseLocale",
};

const PASSWORD_ERRORS: Record<string, string> = {
  currentPassword: "passwordRequired",
  newPassword: "passwordHint",
};

export async function accountAction(
  request: Request,
  context: Readonly<RouterContextProvider>,
  locale: "it" | "en",
) {
  assertSameOrigin(request);
  const user = requireUser(context, locale);
  const client = api(request, { userId: user.userId, role: user.role });
  const form: FormData = await request.formData();
  const field = (name: string): string => {
    const value: FormDataEntryValue | null = form.get(name);
    return typeof value === "string" ? value : "";
  };
  const intent: FormDataEntryValue | null = form.get("intent");
  const result: AccountResult = {
    intent: intent === "password" ? "password" : "profile",
    values: {
      firstName: field("firstName"),
      lastName: field("lastName"),
      preferredLocale: field("preferredLocale"),
    },
    errors: {},
    error: null,
  };
  const invalid = (issues: z.core.$ZodIssue[], messages: Record<string, string>) => {
    const errors: Record<string, string> = {};
    for (const issue of issues) {
      const name = String(issue.path[0]);
      errors[name] = messages[name] ?? "invalidForm";
    }
    return data<AccountResult>({ ...result, errors }, { status: 400 });
  };
  const profileSchema = identityContract.updateMe["~orpc"].inputSchema;
  const passwordSchema = identityContract.changePassword["~orpc"].inputSchema;
  if (!profileSchema || !passwordSchema) throw new Error("Identity input schemas are missing");
  if (intent === "profile") {
    const input = profileSchema.safeParse(result.values);
    if (!input.success) return invalid(input.error.issues, PROFILE_ERRORS);
    const updated = await client.identity.updateMe(input.data);
    const session = context.get(sessionContext);
    session.set("locale", updated.preferredLocale);
    return redirect(`/${locale}/account?saved=profile`, {
      status: 303,
      headers: { "Set-Cookie": await context.get(sessionStorageContext).commitSession(session) },
    });
  }
  if (intent !== "password")
    return data<AccountResult>({ ...result, error: "invalidForm" }, { status: 400 });
  const input = passwordSchema.safeParse({
    currentPassword: field("currentPassword"),
    newPassword: field("newPassword"),
  });
  if (!input.success) return invalid(input.error.issues, PASSWORD_ERRORS);
  try {
    await client.identity.changePassword(input.data);
  } catch (error: unknown) {
    if (!(error instanceof ORPCError) || error.code !== "INVALID_CURRENT_PASSWORD") throw error;
    return data<AccountResult>(
      { ...result, errors: { currentPassword: "wrongCurrentPassword" } },
      { status: 422 },
    );
  }
  return redirect(`/${locale}/account?saved=password`, { status: 303 });
}
