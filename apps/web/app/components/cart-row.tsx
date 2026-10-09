import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useFetcher, useFetchers } from "react-router";
import type { CartProduct, CartResult } from "../lib/cart.server.js";
import { FormAlert } from "./form-alert.js";
import { Price } from "./price.js";
import { ProductImage } from "./product-image.js";
import { QuantityStepper } from "./quantity-stepper.js";

export function CartRow({
  line,
  onRemove,
}: {
  line: CartProduct;
  onRemove: (line: CartProduct) => void;
}) {
  const { t, i18n } = useTranslation("shop");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  const fetcher = useFetcher<CartResult>();
  const fetchers = useFetchers();
  const busy: boolean =
    fetcher.state !== "idle" || fetchers.some((pending) => pending.formAction?.endsWith("/cart"));
  const name: string = line.product?.name[locale] ?? line.slug;
  return (
    <li className="cart-row" aria-busy={busy}>
      <div className="cart-thumbnail">
        <ProductImage src={line.image} name="" />
      </div>
      <div className="cart-row-name">
        <h2>{line.product ? <Link to={`/${locale}/products/${line.slug}`}>{name}</Link> : name}</h2>
        {line.product ? (
          <p>
            <Price cents={line.product.priceCents} locale={locale} /> {t("each")}
          </p>
        ) : (
          <p className="field-error">{t("productUnavailable")}</p>
        )}
      </div>
      <QuantityStepper
        value={line.quantity}
        busy={busy || !line.product}
        onChange={(quantity: number) => {
          void fetcher.submit(
            { intent: "set", slug: line.slug, quantity },
            { method: "post", action: `/${locale}/cart` },
          );
        }}
      />
      <div className="cart-line-total">
        {line.product && <Price cents={line.product.priceCents * line.quantity} locale={locale} />}
      </div>
      <button
        type="button"
        className="cart-remove"
        disabled={busy}
        aria-label={t("removeProduct", { name })}
        onClick={() => onRemove(line)}
      >
        <Trash2 size={20} aria-hidden="true" />
      </button>
      {fetcher.data?.error && (
        <div className="cart-row-error">
          <FormAlert message={t(fetcher.data.error)} />
        </div>
      )}
    </li>
  );
}
