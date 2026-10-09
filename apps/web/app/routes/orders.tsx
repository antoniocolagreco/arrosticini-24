import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Breadcrumb } from "../components/breadcrumb.js";
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
  return (
    <section className="catalog-page">
      <Breadcrumb items={[{ label: t("orders") }]} />
      <div className="catalog-heading">
        <h1>{t("orders")}</h1>
      </div>
      {loaderData.items.length ? (
        <ul className="orders-list">
          {loaderData.items.map((order) => (
            <li key={order.id}>
              <div>
                <Link className="order-reference" to={`/${locale}/orders/${order.id}`}>
                  {t("orderReference", { id: order.id })}
                </Link>
                <p>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(order.createdAt))}
                </p>
              </div>
              <StatusBadge status={order.status} />
              <Price cents={order.totalCents} locale={locale} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="catalog-empty">
          <h2>{t("noOrders")}</h2>
          <Button asChild>
            <Link to={`/${locale}/products`}>{t("continueShopping")}</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
