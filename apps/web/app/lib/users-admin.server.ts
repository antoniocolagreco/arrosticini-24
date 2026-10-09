import { IdDto } from "@arrosticini/contracts";
import { data, type RouterContextProvider, redirect } from "react-router";
import { api, getApiError } from "./api.server.js";
import { requireAdmin } from "./catalog-admin.server.js";
import { type AuthSessionData, assertSameOrigin } from "./session.server.js";

export interface UserAdminResult {
  error: string;
}

export async function userAdminAction(
  request: Request,
  context: Readonly<RouterContextProvider>,
  locale: "it" | "en",
  id: string | undefined,
) {
  assertSameOrigin(request);
  const admin: AuthSessionData = requireAdmin(context, locale);
  const userId = IdDto.safeParse(id);
  const intent: FormDataEntryValue | null = (await request.formData()).get("intent");
  if (!userId.success || (intent !== "suspend" && intent !== "reactivate"))
    return data<UserAdminResult>({ error: "invalidForm" }, { status: 400 });
  try {
    await api(request, { userId: admin.userId, role: admin.role }).identity.setUserStatus({
      id: userId.data,
      status: intent === "suspend" ? "SUSPENDED" : "ACTIVE",
    });
  } catch (error: unknown) {
    const code: ReturnType<typeof getApiError> = getApiError(error);
    if (code === "USER_NOT_SUSPENDABLE")
      return data<UserAdminResult>({ error: "userNotSuspendable" }, { status: 409 });
    if (code === "USER_NOT_FOUND") throw new Response(null, { status: 404 });
    throw error;
  }
  return redirect(
    `/${locale}/admin/users/${userId.data}?saved=${intent === "suspend" ? "suspended" : "reactivated"}`,
    { status: 303 },
  );
}
