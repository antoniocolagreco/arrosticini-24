import { IdDto } from "@arrosticini/contracts";
import { ORPCError } from "@orpc/client";
import { CircleCheck, Clock3, RefreshCw, ShoppingCart } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useRevalidator } from "react-router";
import { AddressCard } from "../components/address-card.js";
import { Breadcrumb } from "../components/breadcrumb.js";
import { OrderSummary } from "../components/order-summary.js";
import { StatusBadge } from "../components/status-badge.js";
import { Button } from "../components/ui/button.js";
import { api } from "../lib/api.server.js";
import { requireUser } from "../lib/session.server.js";
import type { Route } from "./+types/order.js";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = requireUser(context, params.lang);
  if (!IdDto.safeParse(params.id).success) throw new Response(null, { status: 404 });
  try {
    return {
      order: await api(request, { userId: user.userId, role: user.role }).ordering.getOrder({
        id: params.id,
      }),
    };
  } catch (error: unknown) {
    if (error instanceof ORPCError && error.code === "ORDER_NOT_FOUND")
      throw new Response(null, { status: 404 });
    throw error;
  }
}

export default function Order({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("shop");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  const { order } = loaderData;
  const revalidator = useRevalidator();
  useEffect(() => {
    if (order.status !== "PENDING_PAYMENT") return;
    const timer: ReturnType<typeof setInterval> = setInterval(() => {
      if (document.visibilityState === "visible" && revalidator.state === "idle")
        void revalidator.revalidate();
    }, 3000);
    return () => clearInterval(timer);
  }, [order.status, revalidator]);
  return (
    <section className="catalog-page">
      <Breadcrumb
        items={[
          { label: t("orders"), to: `/${locale}/orders` },
          { label: t("orderReference", { id: order.id }) },
        ]}
      />
      <div className="catalog-heading">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("orderDetails")}</h1>
        <StatusBadge status={order.status} />
        <p className="order-date">
          {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
            new Date(order.createdAt),
          )}
        </p>
      </div>
      <div className={`payment-notice payment-${order.status.toLowerCase()}`}>
        <p role="status">
          {order.status === "PAID" ? (
            <CircleCheck aria-hidden="true" />
          ) : (
            <Clock3 aria-hidden="true" />
          )}
          {t(
            `payment${order.status === "PAID" ? "Paid" : order.status === "CANCELLED" ? "Cancelled" : "Pending"}`,
          )}
        </p>
        {order.status === "PENDING_PAYMENT" && (
          <Button
            variant="outline"
            disabled={revalidator.state !== "idle"}
            onClick={() => {
              void revalidator.revalidate();
            }}
          >
            <RefreshCw size={20} aria-hidden="true" />
            {t("refreshPayment")}
          </Button>
        )}
        {order.status === "CANCELLED" && (
          <Button asChild variant="outline">
            <Link to={`/${locale}/cart`}>
              <ShoppingCart size={20} aria-hidden="true" />
              {t("cart")}
            </Link>
          </Button>
        )}
      </div>
      <div className="cart-layout">
        <div>
          <h2 className="section-title">{t("shippingAddress")}</h2>
          <AddressCard address={order.shippingAddress} />
        </div>
        <OrderSummary
          lines={order.lines.map((line) => ({
            slug: line.slug,
            name: line.name[locale],
            quantity: line.quantity,
            cents: line.unitPriceCents * line.quantity,
          }))}
          total={order.totalCents}
        />
      </div>
    </section>
  );
}
