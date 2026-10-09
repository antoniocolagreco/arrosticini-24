import { IdDto, type OrderStatus } from "@arrosticini/contracts";
import { ORPCError } from "@orpc/client";
import { CircleCheck, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, Link, useNavigation, useSearchParams } from "react-router";
import { AddressCard } from "../components/address-card.js";
import { AddressForm } from "../components/address-form.js";
import { Breadcrumb } from "../components/breadcrumb.js";
import { FormAlert } from "../components/form-alert.js";
import { FormField } from "../components/form-field.js";
import { OrderSummary } from "../components/order-summary.js";
import { ShipmentDetails } from "../components/shipment-details.js";
import { StatusBadge } from "../components/status-badge.js";
import { Button } from "../components/ui/button.js";
import { api } from "../lib/api.server.js";
import { requireAdmin } from "../lib/catalog-admin.server.js";
import { orderAdminAction } from "../lib/orders-admin.server.js";
import type { Route } from "./+types/admin-order.js";

const EDITABLE: readonly OrderStatus[] = ["PENDING_PAYMENT", "PAID"];
const SHIPPED: readonly OrderStatus[] = ["SHIPPED", "DELIVERED", "LOST"];

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const admin = requireAdmin(context, params.lang);
  const id = IdDto.safeParse(params.id);
  if (!id.success) throw new Response(null, { status: 404 });
  try {
    return {
      order: await api(request, { userId: admin.userId, role: admin.role }).ordering.getOrder({
        id: id.data,
      }),
    };
  } catch (error: unknown) {
    if (error instanceof ORPCError && error.code === "ORDER_NOT_FOUND")
      throw new Response(null, { status: 404 });
    throw error;
  }
}

export async function action({ request, context, params }: Route.ActionArgs) {
  return orderAdminAction(request, context, params.lang === "en" ? "en" : "it", params.id);
}

export default function AdminOrder({ loaderData, actionData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("admin");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  const navigation = useNavigation();
  const busy: boolean = navigation.state !== "idle";
  const [searchParams] = useSearchParams();
  const { order } = loaderData;
  const failed = actionData && !actionData.error ? actionData.intent : null;
  const [open, setOpen] = useState<"address" | "ship" | null>(
    failed === "address" || failed === "ship" ? failed : null,
  );
  const saved: string | null = open || actionData ? null : searchParams.get("saved");
  useEffect(() => {
    setOpen(null);
  }, [loaderData]);
  useEffect(() => {
    if (failed === "address" || failed === "ship") setOpen(failed);
  }, [failed]);
  const focusOnOpen = useRef<boolean>(false);
  const edit = (panel: "address" | "ship") => {
    focusOnOpen.current = true;
    setOpen(panel);
  };
  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    document.getElementById(open === "address" ? "address-fullName" : "carrier")?.focus();
  }, [open]);
  useEffect(() => {
    if (actionData)
      document
        .querySelector<HTMLElement>('.admin-page [aria-invalid="true"],.admin-page [role="alert"]')
        ?.focus();
  }, [actionData]);
  const shipping: boolean = order.status === "PAID" || open === "ship";
  const shipValues: Record<string, string> =
    actionData?.intent === "ship"
      ? actionData.values
      : {
          carrier: order.shipment?.carrier ?? "",
          trackingNumber: order.shipment?.trackingNumber ?? "",
          trackingUrl: order.shipment?.trackingUrl ?? "",
        };
  const shipErrors: Record<string, string> = actionData?.intent === "ship" ? actionData.errors : {};
  const shipField = (name: "carrier" | "trackingNumber" | "trackingUrl") => ({
    id: name,
    name,
    defaultValue: shipValues[name] ?? "",
    ...(shipErrors[name] ? { error: t(shipErrors[name]) } : {}),
  });
  const reference: string = t("orderReference", { ns: "shop", id: order.id });
  return (
    <section className="catalog-page admin-page">
      <Breadcrumb
        items={[
          { label: t("account", { ns: "account" }), to: `/${locale}/account` },
          { label: t("allOrders"), to: `/${locale}/admin/orders` },
          { label: reference },
        ]}
      />
      <div className="catalog-heading">
        <p className="eyebrow">{reference}</p>
        <h1>
          {t("orderTitle", {
            ns: "shop",
            date: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
              new Date(order.createdAt),
            ),
          })}
        </h1>
        <p className="catalog-intro">
          <Link className="admin-table-link" to={`/${locale}/admin/users/${order.userId}`}>
            {t("customerCard", { name: order.shippingAddress.fullName })}
          </Link>
        </p>
      </div>
      {actionData?.error && <FormAlert message={t(actionData.error)} />}
      {saved && ["address", "shipment", "delivered", "lost"].includes(saved) && (
        <p className="admin-notice" role="status">
          <CircleCheck size={20} aria-hidden="true" />
          {t(`saved_${saved}`)}
        </p>
      )}
      <div className="order-detail admin-order">
        <OrderSummary
          lines={order.lines.map((line) => ({
            slug: line.slug,
            name: line.name[locale],
            quantity: line.quantity,
            cents: line.unitPriceCents * line.quantity,
          }))}
          total={order.totalCents}
          title={t("orderSummary")}
          badge={<StatusBadge status={order.status} />}
        />
        <div className="admin-order-panels">
          {open === "address" ? (
            <AddressForm
              title={t("editShippingAddress")}
              intent="address"
              address={order.shippingAddress}
              result={actionData?.intent === "address" ? actionData : undefined}
              onCancel={() => setOpen(null)}
            />
          ) : (
            <section className="panel" aria-labelledby="shipping-title">
              <div className="panel-head">
                <h2 id="shipping-title" className="panel-title">
                  {t("shippingAddress", { ns: "shop" })}
                </h2>
                {EDITABLE.includes(order.status) && (
                  <button
                    type="button"
                    className="icon-action"
                    aria-label={t("editShippingAddress")}
                    title={t("editShippingAddress")}
                    disabled={busy}
                    onClick={() => edit("address")}
                  >
                    <Pencil size={20} aria-hidden="true" />
                  </button>
                )}
              </div>
              <AddressCard address={order.shippingAddress} />
            </section>
          )}
          {(order.shipment || shipping) && (
            <section className="panel" aria-labelledby="shipment-title">
              <div className="panel-head">
                <h2 id="shipment-title" className="panel-title">
                  {t("shipment", { ns: "shop" })}
                </h2>
                {SHIPPED.includes(order.status) && !shipping && (
                  <button
                    type="button"
                    className="icon-action"
                    aria-label={t("editShipment")}
                    title={t("editShipment")}
                    disabled={busy}
                    onClick={() => edit("ship")}
                  >
                    <Pencil size={20} aria-hidden="true" />
                  </button>
                )}
              </div>
              {shipping ? (
                <Form method="post" className="address-form">
                  <input type="hidden" name="intent" value="ship" />
                  <FormField
                    {...shipField("carrier")}
                    label={t("carrier", { ns: "shop" })}
                    placeholder="BRT"
                    maxLength={60}
                    required
                  />
                  <FormField
                    {...shipField("trackingNumber")}
                    label={t("trackingNumber")}
                    maxLength={60}
                  />
                  <FormField
                    {...shipField("trackingUrl")}
                    className="field-wide"
                    label={t("trackingUrl")}
                    hint={t("trackingUrlHint")}
                    type="url"
                    inputMode="url"
                    placeholder="https://"
                    maxLength={500}
                  />
                  <div className="form-actions field-wide">
                    <Button type="submit" busy={busy}>
                      {t(order.status === "PAID" ? "markShipped" : "saveShipment")}
                    </Button>
                    {open === "ship" && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(null)}
                        disabled={busy}
                      >
                        {t("cancel", { ns: "account" })}
                      </Button>
                    )}
                  </div>
                </Form>
              ) : (
                order.shipment && <ShipmentDetails shipment={order.shipment} />
              )}
              {order.status === "SHIPPED" && !shipping && (
                <Form method="post" className="form-actions admin-close-order">
                  <input type="hidden" name="intent" value="close" />
                  <Button type="submit" name="status" value="DELIVERED" busy={busy}>
                    {t("markDelivered")}
                  </Button>
                  <Button type="submit" name="status" value="LOST" variant="outline" busy={busy}>
                    {t("markLost")}
                  </Button>
                </Form>
              )}
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
