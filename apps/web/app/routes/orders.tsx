import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { AccountLayout } from "../components/account-layout.js";
import { Price } from "../components/price.js";
import { StatusBadge } from "../components/status-badge.js";
import { Button } from "../components/ui/button.js";
import { api } from "../lib/api.server.js";
import { requireUser } from "../lib/session.server.js";
import type { Route } from "./+types/orders.js";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = requireUser(context, params.lang);
  return api(request, { userId: user.userId, role: user.role }).ordering.listOrders();
}

export default function Orders({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("shop");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  return (
    <AccountLayout
      crumbs={[{ label: t("orders") }]}
      title={t("ordersTitle")}
      intro={t("ordersIntro")}
    >
      {loaderData.items.length ? (
        <ul className="order-list">
          {loaderData.items.map((order) => (
            <li key={order.id}>
              <Link className="order-row" to={`/${locale}/orders/${order.id}`}>
                <span className="order-row-when">
                  <strong>{date.format(new Date(order.createdAt))}</strong>
                  <span className="order-row-ref">{t("orderReference", { id: order.id })}</span>
                </span>
                <span className="order-row-items">
                  {order.lines.map((line) => `${line.name[locale]} × ${line.quantity}`).join(", ")}
                </span>
                <StatusBadge status={order.status} />
                <span className="order-row-total">
                  <Price cents={order.totalCents} locale={locale} small />
                </span>
                <ArrowRight className="order-row-arrow" size={20} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="catalog-empty">
          <img src="/images/sheep.webp" alt="" width="112" height="112" />
          <h2>{t("noOrders")}</h2>
          <p>{t("noOrdersIntro")}</p>
          <Button asChild>
            <Link to={`/${locale}/products`}>{t("continueShopping")}</Link>
          </Button>
        </div>
      )}
    </AccountLayout>
  );
}
