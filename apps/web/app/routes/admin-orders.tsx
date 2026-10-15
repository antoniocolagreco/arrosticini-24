import { Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { AccountLayout } from "../components/account-layout.js";
import { Price } from "../components/price.js";
import { StatusBadge } from "../components/status-badge.js";
import { api } from "../lib/api.server.js";
import { requireAdmin } from "../lib/catalog-admin.server.js";
import type { Route } from "./+types/admin-orders.js";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = requireAdmin(context, params.lang);
  return api(request, { userId: user.userId, role: user.role }).ordering.listAllOrders({});
}

export default function AdminOrders({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("admin");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  return (
    <AccountLayout
      crumbs={[{ label: t("allOrders") }]}
      eyebrow={t("eyebrow")}
      title={t("allOrders")}
      intro={t("ordersIntro")}
    >
      <p className="catalog-count" role="status">
        {t("orderResults", { count: loaderData.items.length })}
      </p>
      <section className="admin-table-wrap" aria-label={t("allOrders")}>
        {loaderData.items.length === 0 && (
          <div className="catalog-empty">
            <Package size={48} aria-hidden="true" />
            <h2>{t("noOrders")}</h2>
          </div>
        )}
        <table className="admin-table" hidden={loaderData.items.length === 0}>
          <thead>
            <tr>
              <th scope="col">{t("order")}</th>
              <th scope="col">{t("recipient")}</th>
              <th scope="col">{t("status")}</th>
              <th scope="col" className="num">
                {t("total", { ns: "shop" })}
              </th>
            </tr>
          </thead>
          <tbody>
            {loaderData.items.map((order) => (
              <tr key={order.id}>
                <th scope="row" className="admin-product-name">
                  <Link to={`/${locale}/admin/orders/${order.id}`}>
                    {date.format(new Date(order.createdAt))}
                  </Link>
                  <small>{t("orderReference", { ns: "shop", id: order.id })}</small>
                </th>
                <td>
                  <Link className="admin-table-link" to={`/${locale}/admin/users/${order.userId}`}>
                    {order.shippingAddress.fullName}
                  </Link>
                </td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
                <td className="num">
                  <Price cents={order.totalCents} locale={locale} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AccountLayout>
  );
}
