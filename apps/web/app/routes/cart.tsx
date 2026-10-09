import { CircleCheck, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useFetcher } from "react-router";
import { Breadcrumb } from "../components/breadcrumb.js";
import { CartRow } from "../components/cart-row.js";
import { FormAlert } from "../components/form-alert.js";
import { Price } from "../components/price.js";
import { Button } from "../components/ui/button.js";
import {
  type CartProduct,
  type CartResult,
  cartProducts,
  changeCart,
  readCart,
} from "../lib/cart.server.js";
import type { Route } from "./+types/cart.js";

export async function loader({ request, context }: Route.LoaderArgs) {
  const lines: CartProduct[] = await cartProducts(request, await readCart(request, context));
  const total: number | null = lines.some((line) => !line.product)
    ? null
    : lines.reduce(
        (sum: number, line: CartProduct) => sum + (line.product?.priceCents ?? 0) * line.quantity,
        0,
      );
  return { lines, total };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  return changeCart(request, context, params.lang);
}

export default function Cart({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("shop");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  const fetcher = useFetcher<CartResult>();
  const [removed, setRemoved] = useState<CartProduct | null>(null);
  useEffect(() => {
    if (fetcher.data?.ok && fetcher.data.quantity > 0) setRemoved(null);
  }, [fetcher.data]);
  const pending: boolean = fetcher.state !== "idle";
  return (
    <section className="catalog-page cart-page">
      <Breadcrumb items={[{ label: t("cart") }]} />
      <div className="catalog-heading">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>
          <span>{t("cartTitleFirst")}</span> <span>{t("cartTitleSecond")}</span>
        </h1>
        <p className="catalog-intro">{t("cartIntro")}</p>
      </div>
      {fetcher.data?.error && <FormAlert message={t(fetcher.data.error)} />}
      {removed &&
        !pending &&
        fetcher.data?.ok &&
        fetcher.data.slug === removed.slug &&
        fetcher.data.quantity === 0 && (
          <div className="cart-notice" role="status">
            <CircleCheck size={20} aria-hidden="true" />
            <p>{t("removed", { name: removed.product?.name[locale] ?? removed.slug })}</p>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (removed)
                  void fetcher.submit(
                    { intent: "set", slug: removed.slug, quantity: removed.quantity },
                    { method: "post" },
                  );
              }}
            >
              {t("undo")}
            </Button>
          </div>
        )}
      {loaderData.lines.length === 0 ? (
        <div className="catalog-empty">
          <ShoppingCart size={48} aria-hidden="true" />
          <h2>{t("emptyCartTitle")}</h2>
          <p>{t("emptyCart")}</p>
          <Button asChild>
            <Link to={`/${locale}/products`}>{t("continueShopping")}</Link>
          </Button>
        </div>
      ) : (
        <div className="cart-layout">
          <ul className="cart-lines" aria-busy={pending}>
            {loaderData.lines.map((line: CartProduct) => (
              <CartRow
                key={line.slug}
                line={line}
                onRemove={(removedLine: CartProduct) => {
                  setRemoved(removedLine);
                  void fetcher.submit(
                    { intent: "set", slug: removedLine.slug, quantity: 0 },
                    { method: "post" },
                  );
                }}
              />
            ))}
          </ul>
          <aside className="order-summary" aria-labelledby="summary-title">
            <h2 id="summary-title">{t("summary")}</h2>
            <dl>
              {loaderData.lines.map((line: CartProduct) => (
                <div key={line.slug}>
                  <dt>
                    {line.product?.name[locale] ?? line.slug} × {line.quantity}
                  </dt>
                  <dd>
                    {line.product ? (
                      <Price cents={line.product.priceCents * line.quantity} locale={locale} />
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="summary-total">
              <span>{t("total")}</span>
              {loaderData.total !== null ? (
                <Price cents={loaderData.total} locale={locale} />
              ) : (
                <span>—</span>
              )}
            </div>
            {loaderData.total === null && <FormAlert message={t("unavailableCart")} />}
            <Button asChild variant="outline">
              <Link to={`/${locale}/products`}>{t("continueShopping")}</Link>
            </Button>
          </aside>
        </div>
      )}
    </section>
  );
}
