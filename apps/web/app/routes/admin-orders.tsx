import { OrderStatus } from "@arrosticini/contracts";
import { Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, Form, Link, useNavigation } from "react-router";
import { AccountLayout } from "../components/account-layout.js";
import { Pager } from "../components/pager.js";
import { Price } from "../components/price.js";
import { StatusBadge } from "../components/status-badge.js";
import { Button } from "../components/ui/button.js";
import { api } from "../lib/api.server.js";
import { requireAdmin } from "../lib/catalog-admin.server.js";
import { loadPage, readCursor } from "../lib/pagination.server.js";
import type { Route } from "./+types/admin-orders.js";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = requireAdmin(context, params.lang);
  const status: string = new URL(request.url).searchParams.get("status") ?? "";
  const parsedStatus = OrderStatus.safeParse(status);
  if (status && !parsedStatus.success) throw data(null, { status: 400 });
  const cursor: string | undefined = readCursor(request);
  const page = await loadPage(() =>
    api(request, { userId: user.userId, role: user.role }).ordering.listAllOrders({
      ...(parsedStatus.success ? { status: parsedStatus.data } : {}),
      ...(cursor ? { cursor } : {}),
    }),
  );
  return { ...page, status };
}

export default function AdminOrders({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("admin");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  const navigation = useNavigation();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  return (
    <AccountLayout
      crumbs={[{ label: t("allOrders") }]}
      eyebrow={t("eyebrow")}
      title={t("allOrders")}
      intro={t("ordersIntro")}
    >
      <Form method="get" className="admin-filters" aria-busy={navigation.state !== "idle"}>
        <div className="form-field">
          <label className="sr-only" htmlFor="admin-order-status">
            {t("status")}
          </label>
          <select
            key={loaderData.status}
            id="admin-order-status"
            name="status"
            defaultValue={loaderData.status}
          >
            <option value="">{t("allStatuses")}</option>
            {OrderStatus.options.map((status) => (
              <option key={status} value={status}>
                {t(status, { ns: "shop" })}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline" busy={navigation.state !== "idle"}>
          {t("filterOrders")}
        </Button>
      </Form>
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
      <Pager nextCursor={loaderData.nextCursor} />
    </AccountLayout>
  );
}
