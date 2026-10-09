import { CircleCheck, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useFetcher } from "react-router";
import { Breadcrumb } from "../components/breadcrumb.js";
import { CartRow } from "../components/cart-row.js";
import { CartSummary } from "../components/cart-summary.js";
import { FormAlert } from "../components/form-alert.js";
import { Button } from "../components/ui/button.js";
import {
  type CartProduct,
  type CartResult,
  cartProducts,
  cartTotal,
  changeCart,
  readCart,
} from "../lib/cart.server.js";
import type { Route } from "./+types/cart.js";

export async function loader({ request, context }: Route.LoaderArgs) {
  const lines: CartProduct[] = await cartProducts(request, await readCart(request, context));
  const total: number | null = cartTotal(lines);
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
  const [previousRemoval, setPreviousRemoval] = useState<CartProduct | null>(null);
  const pending: boolean = fetcher.state !== "idle";
  const notice: CartProduct | null =
    !pending && fetcher.data?.ok && fetcher.data.slug === removed?.slug
      ? fetcher.data.quantity === 0
        ? removed
        : null
      : previousRemoval;
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
      {notice && (
        <div className="cart-notice" role="status">
          <CircleCheck size={20} aria-hidden="true" />
          <p>{t("removed", { name: notice.product?.name[locale] ?? notice.slug })}</p>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              setPreviousRemoval(notice);
              void fetcher.submit(
                { intent: "set", slug: notice.slug, quantity: notice.quantity },
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
                  setPreviousRemoval(notice);
                  setRemoved(removedLine);
                  void fetcher.submit(
                    { intent: "set", slug: removedLine.slug, quantity: 0 },
                    { method: "post" },
                  );
                }}
              />
            ))}
          </ul>
          <CartSummary lines={loaderData.lines} total={loaderData.total}>
            {loaderData.total === null && <FormAlert message={t("unavailableCart")} />}
            <Button asChild>
              <Link to={`/${locale}/checkout`}>{t("goToCheckout")}</Link>
            </Button>
          </CartSummary>
        </div>
      )}
    </section>
  );
}
