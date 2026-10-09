import { CreditCard, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Form, useNavigation } from "react-router";
import { AccountLayout } from "../components/account-layout.js";
import { FormAlert } from "../components/form-alert.js";
import { PaymentMethodCard } from "../components/payment-method-card.js";
import { Button } from "../components/ui/button.js";
import { api } from "../lib/api.server.js";
import { paymentMethodsAction } from "../lib/payments.server.js";
import { customerOnlyMiddleware, requireUser } from "../lib/session.server.js";
import type { Route } from "./+types/payment-methods.js";

export const middleware = [customerOnlyMiddleware];

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = requireUser(context, params.lang);
  return api(request, { userId: user.userId, role: user.role }).payments.listPaymentMethods();
}

export async function action({ request, context, params }: Route.ActionArgs) {
  return paymentMethodsAction(request, context, params.lang === "en" ? "en" : "it");
}

export default function PaymentMethods({ loaderData, actionData }: Route.ComponentProps) {
  const { t } = useTranslation("account");
  const navigation = useNavigation();
  const busy: boolean = navigation.state !== "idle";
  const opening: boolean = busy && navigation.formData?.get("intent") === "setup";
  return (
    <AccountLayout
      crumbs={[{ label: t("paymentMethods") }]}
      title={t("paymentMethodsTitle")}
      intro={t("paymentMethodsIntro")}
    >
      {actionData?.error && <FormAlert message={t(actionData.error)} />}
      {loaderData.items.length ? (
        <ul className="tile-grid">
          {loaderData.items.map((method) => (
            <PaymentMethodCard key={method.id} method={method} />
          ))}
          <li>
            <Form method="post" aria-busy={opening}>
              <input type="hidden" name="intent" value="setup" />
              <button type="submit" className="tile-add" disabled={busy}>
                <Plus size={20} aria-hidden="true" />
                <b>{t(opening ? "openingStripe" : "addCard")}</b>
                <span className="tile-add-hint">{t("addCardHint")}</span>
              </button>
            </Form>
          </li>
        </ul>
      ) : (
        <div className="catalog-empty">
          <img src="/images/sheep.webp" alt="" width="112" height="112" />
          <h2>{t("noCardsTitle")}</h2>
          <p>{t("noCards")}</p>
          <Form method="post" aria-busy={opening}>
            <input type="hidden" name="intent" value="setup" />
            <Button type="submit" busy={busy}>
              <CreditCard aria-hidden="true" />
              {t(opening ? "openingStripe" : "addCard")}
            </Button>
          </Form>
        </div>
      )}
    </AccountLayout>
  );
}
