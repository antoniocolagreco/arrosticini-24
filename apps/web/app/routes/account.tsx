import { CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { redirect, useSearchParams } from "react-router";
import { AccountLayout } from "../components/account-layout.js";
import { FormAlert } from "../components/form-alert.js";
import { PasswordPanel, ProfilePanel } from "../components/profile-panels.js";
import { type AccountResult, accountAction } from "../lib/account.server.js";
import { api, getApiError } from "../lib/api.server.js";
import {
  type AuthSessionData,
  requireUser,
  sessionContext,
  sessionStorageContext,
} from "../lib/session.server.js";
import type { Route } from "./+types/account.js";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user: AuthSessionData = requireUser(context, params.lang);
  try {
    return { user: await api(request, { userId: user.userId, role: user.role }).identity.getMe() };
  } catch (error: unknown) {
    if (getApiError(error) !== "UNAUTHORIZED") throw error;
    const cookie: string = await context
      .get(sessionStorageContext)
      .destroySession(context.get(sessionContext));
    throw redirect(`/${params.lang}/login`, { headers: { "Set-Cookie": cookie } });
  }
}

export async function action({ request, context, params }: Route.ActionArgs) {
  return accountAction(request, context, params.lang === "en" ? "en" : "it");
}

export default function Account({ loaderData, actionData }: Route.ComponentProps) {
  const { t } = useTranslation("account");
  const [searchParams] = useSearchParams();
  const { user } = loaderData;
  const failed: AccountResult["intent"] | null =
    actionData && !actionData.error ? actionData.intent : null;
  const [open, setOpen] = useState<AccountResult["intent"] | null>(failed);
  const saved: string | null = open || actionData ? null : searchParams.get("saved");
  useEffect(() => {
    setOpen(null);
  }, [loaderData]);
  useEffect(() => {
    if (failed) setOpen(failed);
  }, [failed]);
  useEffect(() => {
    if (open)
      document
        .getElementById(open === "profile" ? "profile-firstName" : "password-currentPassword")
        ?.focus();
  }, [open]);
  useEffect(() => {
    if (actionData)
      document
        .querySelector<HTMLElement>(
          '.account-content [aria-invalid="true"],.account-content [role="alert"]',
        )
        ?.focus();
  }, [actionData]);
  const result = (intent: AccountResult["intent"]) =>
    failed === intent && open === intent ? actionData : undefined;
  return (
    <AccountLayout
      crumbs={[]}
      title={t("welcome", { name: user.firstName })}
      intro={t("accountIntro")}
    >
      {actionData?.error && <FormAlert message={t(actionData.error)} />}
      {(saved === "profile" || saved === "password") && (
        <p className="form-success" role="status">
          <CircleCheck size={20} aria-hidden="true" />
          {t(saved === "profile" ? "profileSaved" : "passwordSaved")}
        </p>
      )}
      <ProfilePanel
        user={user}
        open={open === "profile"}
        result={result("profile")}
        onEdit={() => setOpen("profile")}
        onCancel={() => setOpen(null)}
      />
      <PasswordPanel
        email={user.email}
        open={open === "password"}
        result={result("password")}
        onEdit={() => setOpen("password")}
        onCancel={() => setOpen(null)}
      />
    </AccountLayout>
  );
}
