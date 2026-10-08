import type { ProductDto } from "@arrosticini/contracts";
import type { Locale } from "@arrosticini/kernel";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ProductImage } from "./product-image.js";

export function ProductCard({
  product,
  image,
}: {
  product: ProductDto;
  image: string | undefined;
}) {
  const { t, i18n } = useTranslation("shop");
  const locale: Locale = i18n.language === "en" ? "en" : "it";
  return (
    <Link className="product-card" to={`/${locale}/products/${product.slug}`}>
      <ProductImage src={image} name={product.name[locale]} />
      <div className="product-card-body">
        <h2>{product.name[locale]}</h2>
        {product.pieces !== undefined && <p>{t("pieces", { count: product.pieces })}</p>}
        <div className="product-card-footer">
          <strong>
            {new Intl.NumberFormat(locale, {
              style: "currency",
              currency: product.currency,
            }).format(product.priceCents / 100)}
          </strong>
          <ArrowRight aria-hidden="true" size={22} />
        </div>
      </div>
    </Link>
  );
}
