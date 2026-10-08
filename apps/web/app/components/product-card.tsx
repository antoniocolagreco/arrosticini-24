import type { ProductDto } from "@arrosticini/contracts";
import type { Locale } from "@arrosticini/kernel";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Price } from "./price.js";
import { ProductImage } from "./product-image.js";

export function ProductCard({
  product,
  image,
  layout,
}: {
  product: ProductDto;
  image: string | undefined;
  layout?: "row";
}) {
  const { t, i18n } = useTranslation("shop");
  const locale: Locale = i18n.language === "en" ? "en" : "it";
  return (
    <article className={layout === "row" ? "product-card product-card-row" : "product-card"}>
      <Link
        className="product-media"
        to={`/${locale}/products/${product.slug}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProductImage src={image} name="" />
      </Link>
      <div className="product-card-body">
        <h2>
          <Link to={`/${locale}/products/${product.slug}`}>{product.name[locale]}</Link>
        </h2>
        <p className="product-card-pieces">
          {product.pieces !== undefined ? t("pieces", { count: product.pieces }) : null}
        </p>
        <div className="product-card-footer">
          <Price cents={product.priceCents} locale={locale} />
        </div>
      </div>
    </article>
  );
}
