import { IdDto } from "@arrosticini/contracts";
import { ArrowRight, CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Form, Link, useNavigation, useSearchParams } from "react-router";
import { AccountLayout } from "../components/account-layout.js";
import { AddressCard } from "../components/address-card.js";
import { FormAlert } from "../components/form-alert.js";
import { Price } from "../components/price.js";
import { StatusBadge } from "../components/status-badge.js";
import { Button } from "../components/ui/button.js";
import { api, getApiError } from "../lib/api.server.js";
import { requireAdmin } from "../lib/catalog-admin.server.js";
import { userAdminAction } from "../lib/users-admin.server.js";
import type { Route } from "./+types/admin-user.js";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const admin = requireAdmin(context, params.lang);
  const id = IdDto.safeParse(params.id);
  if (!id.success) throw new Response(null, { status: 404 });
  const client = api(request, { userId: admin.userId, role: admin.role });
  try {
    const [card, orders] = await Promise.all([
      client.identity.getUser({ id: id.data }),
      client.ordering.listAllOrders({ userId: id.data }),
    ]);
    return { ...card, orders: orders.items };
  } catch (error: unknown) {
    if (getApiError(error) === "USER_NOT_FOUND") throw new Response(null, { status: 404 });
    throw error;
  }
}

export async function action({ request, context, params }: Route.ActionArgs) {
  return userAdminAction(request, context, params.lang === "en" ? "en" : "it", params.id);
}

export default function AdminUser({ loaderData, actionData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("admin");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const { user, addresses, orders } = loaderData;
  const saved: string | null = actionData ? null : searchParams.get("saved");
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const name = `${user.firstName} ${user.lastName}`;
  return (
    <AccountLayout
      crumbs={[{ label: t("users"), to: `/${locale}/admin/users` }, { label: name }]}
      eyebrow={t("userCard")}
      title={name}
      actions={
        user.role === "customer" && (
          <Form method="post">
            <input
              type="hidden"
              name="intent"
              value={user.status === "ACTIVE" ? "suspend" : "reactivate"}
            />
            <Button
              type="submit"
              variant={user.status === "ACTIVE" ? "outline" : "default"}
              busy={navigation.state !== "idle"}
            >
              {t(user.status === "ACTIVE" ? "suspend" : "reactivate")}
            </Button>
          </Form>
        )
      }
    >
      {actionData?.error && <FormAlert message={t(actionData.error)} />}
      {(saved === "suspended" || saved === "reactivated") && (
        <p className="admin-notice" role="status">
          <CircleCheck size={20} aria-hidden="true" />
          {t(saved === "suspended" ? "userSuspended" : "userReactivated", { name })}
        </p>
      )}
      <div className="admin-user">
        <section className="panel" aria-labelledby="user-profile">
          <h2 id="user-profile" className="panel-title">
            {t("profile")}
          </h2>
          <dl className="account-details">
            <div>
              <dt>{t("email", { ns: "account" })}</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>{t("status")}</dt>
              <dd>
                <span className={`status-badge user-status-${user.status.toLowerCase()}`}>
                  {t(`user${user.status}`)}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t("role")}</dt>
              <dd>{t(`${user.role}_role`)}</dd>
            </div>
            <div>
              <dt>{t("preferredLocale", { ns: "account" })}</dt>
              <dd>{user.preferredLocale === "it" ? "Italiano" : "English"}</dd>
            </div>
            <div>
              <dt>{t("registeredAt")}</dt>
              <dd>{date.format(new Date(user.createdAt))}</dd>
            </div>
          </dl>
        </section>
        <section className="panel" aria-labelledby="user-addresses">
          <h2 id="user-addresses" className="panel-title">
            {t("addresses")}
          </h2>
          {addresses.length ? (
            <div className="tile-grid">
              {addresses.map((address) => (
                <div key={address.id} className="tile">
                  <AddressCard address={address} />
                </div>
              ))}
            </div>
          ) : (
            <p className="panel-note">{t("noAddresses")}</p>
          )}
        </section>
        <section className="panel" aria-labelledby="user-orders">
          <h2 id="user-orders" className="panel-title">
            {t("orders")}
          </h2>
          {orders.length ? (
            <ul className="order-list">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link className="order-row" to={`/${locale}/admin/orders/${order.id}`}>
                    <span className="order-row-when">
                      <strong>{date.format(new Date(order.createdAt))}</strong>
                      <span className="order-row-ref">
                        {t("orderReference", { ns: "shop", id: order.id })}
                      </span>
                    </span>
                    <span className="order-row-items">
                      {order.lines
                        .map((line) => `${line.name[locale]} × ${line.quantity}`)
                        .join(", ")}
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
            <p className="panel-note">{t("noUserOrders")}</p>
          )}
        </section>
      </div>
    </AccountLayout>
  );
}
