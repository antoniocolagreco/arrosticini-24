import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { CartProduct } from "../lib/cart.server.js";
import { OrderSummary } from "./order-summary.js";

export function CartSummary({
  lines,
  total,
  children,
}: {
  lines: CartProduct[];
  total: number | null;
  children?: ReactNode;
}) {
  const { i18n } = useTranslation("shop");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  return (
    <OrderSummary
      lines={lines.map((line) => ({
        slug: line.slug,
        name: line.product?.name[locale] ?? line.slug,
        quantity: line.quantity,
        cents: line.product ? line.product.priceCents * line.quantity : null,
      }))}
      total={total}
    >
      {children}
    </OrderSummary>
  );
}
