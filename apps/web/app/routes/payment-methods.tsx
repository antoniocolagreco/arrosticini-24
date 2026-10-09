import { CreditCard, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Form, useNavigation } from "react-router";
import { Breadcrumb } from "../components/breadcrumb.js";
import { FormAlert } from "../components/form-alert.js";
import { PaymentMethodCard } from "../components/payment-method-card.js";
import { Button } from "../components/ui/button.js";
import { api } from "../lib/api.server.js";
import { paymentMethodsAction } from "../lib/payments.server.js";
import { requireUser } from "../lib/session.server.js";
import type { Route } from "./+types/payment-methods.js";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = requireUser(context, params.lang);
  return api(request, { userId: user.userId, role: user.role }).payments.listPaymentMethods();
}

export async function action({ request, context, params }: Route.ActionArgs) {
  return paymentMethodsAction(request, context, params.lang === "en" ? "en" : "it");
}

export default function PaymentMethods({ loaderData, actionData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("account");
  const navigation = useNavigation();
  return (
    <section className="catalog-page">
      <Breadcrumb
        items={[
          { label: t("account"), to: `/${i18n.language}/account` },
          { label: t("paymentMethods") },
        ]}
      />
      <div className="catalog-heading">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("paymentMethods")}</h1>
        <p className="catalog-intro">{t("paymentMethodsIntro")}</p>
      </div>
      <Form method="post" className="payment-method-add" aria-busy={navigation.state !== "idle"}>
        <input type="hidden" name="intent" value="setup" />
        <Button type="submit" disabled={navigation.state !== "idle"}>
          <Plus size={20} aria-hidden="true" />
          {t("addCard")}
        </Button>
      </Form>
      {actionData?.error && <FormAlert message={t(actionData.error)} />}
      {loaderData.items.length === 0 ? (
        <div className="catalog-empty">
          <CreditCard size={48} aria-hidden="true" />
          <h2>{t("noCardsTitle")}</h2>
          <p>{t("noCards")}</p>
        </div>
      ) : (
        <ul className="payment-method-grid">
          {loaderData.items.map((method) => (
            <PaymentMethodCard key={method.id} method={method} />
          ))}
        </ul>
      )}
    </section>
  );
}
