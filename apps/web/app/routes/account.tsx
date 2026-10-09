import { useTranslation } from "react-i18next";
import { redirect } from "react-router";
import { AccountLayout } from "../components/account-layout.js";
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

export default function Account({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("account");
  const { user } = loaderData;
  return (
    <AccountLayout
      crumbs={[]}
      title={t("welcome", { name: user.firstName })}
      intro={t("accountIntro")}
    >
      <section className="panel" aria-labelledby="profile-title">
        <h2 id="profile-title" className="panel-title">
          {t("profileTitle")}
        </h2>
        <dl className="account-details">
          <div>
            <dt>{t("firstName")}</dt>
            <dd>{user.firstName}</dd>
          </div>
          <div>
            <dt>{t("lastName")}</dt>
            <dd>{user.lastName}</dd>
          </div>
          <div>
            <dt>{t("email")}</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>{t("preferredLocale")}</dt>
            <dd>{user.preferredLocale === "it" ? "Italiano" : "English"}</dd>
          </div>
        </dl>
      </section>
    </AccountLayout>
  );
}
