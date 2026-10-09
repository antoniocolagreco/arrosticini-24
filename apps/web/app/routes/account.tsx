import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Form, Link, redirect, useNavigation } from "react-router";
import { Breadcrumb } from "../components/breadcrumb.js";
import { Button } from "../components/ui/button.js";
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
  const { t, i18n } = useTranslation("account");
  const navigation: ReturnType<typeof useNavigation> = useNavigation();
  return (
    <section className="account-page shell">
      <Breadcrumb items={[{ label: t("account") }]} />
      <div className="auth-panel">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("welcome", { name: loaderData.user.firstName })}</h1>
        <p className="account-intro">{t("accountIntro")}</p>
        <Link className="checkout-back" to={`/${i18n.language}/orders`}>
          {t("orders", { ns: "shop" })}
        </Link>
        <dl className="account-details">
          <div>
            <dt>{t("firstName")}</dt>
            <dd>{loaderData.user.firstName}</dd>
          </div>
          <div>
            <dt>{t("lastName")}</dt>
            <dd>{loaderData.user.lastName}</dd>
          </div>
          <div>
            <dt>{t("email")}</dt>
            <dd>{loaderData.user.email}</dd>
          </div>
          <div>
            <dt>{t("preferredLocale")}</dt>
            <dd>{loaderData.user.preferredLocale === "it" ? "Italiano" : "English"}</dd>
          </div>
        </dl>
        <Form method="post" action={`/${i18n.language}/logout`}>
          <Button type="submit" variant="outline" disabled={navigation.state !== "idle"}>
            <LogOut aria-hidden="true" />
            {t("logout")}
          </Button>
        </Form>
      </div>
    </section>
  );
}
