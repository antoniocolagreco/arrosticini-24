import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Price } from "./price.js";

export function OrderSummary({
  lines,
  total,
  badge,
  children,
}: {
  lines: { slug: string; name: string; quantity: number; cents: number | null }[];
  total: number | null;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  const { t, i18n } = useTranslation("shop");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  return (
    <aside className="order-summary" aria-labelledby="summary-title">
      <div className="order-summary-head">
        <h2 id="summary-title">{t("summary")}</h2>
        {badge}
      </div>
      <dl>
        {lines.map((line) => (
          <div key={line.slug}>
            <dt>
              {line.name} × {line.quantity}
            </dt>
            <dd>{line.cents !== null ? <Price cents={line.cents} locale={locale} /> : "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="summary-total">
        <span>{t("total")}</span>
        {total !== null ? <Price cents={total} locale={locale} /> : <span>—</span>}
      </div>
      {children}
    </aside>
  );
}
