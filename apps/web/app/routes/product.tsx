import { ProductSlug } from "@arrosticini/contracts";
import type { Locale } from "@arrosticini/kernel";
import { useTranslation } from "react-i18next";
import { AddToCart } from "../components/add-to-cart.js";
import { Breadcrumb } from "../components/breadcrumb.js";
import { Price } from "../components/price.js";
import { ProductImage } from "../components/product-image.js";
import { api, getApiError } from "../lib/api.server.js";
import { productImages } from "../lib/product.server.js";
import { storefrontMeta } from "../lib/seo.js";
import type { Route } from "./+types/product.js";

export function meta({
  loaderData,
  matches,
  location,
  error,
}: Route.MetaArgs): Route.MetaDescriptors {
  const rootData: { origin: string } | undefined = matches.find((match) => match?.id === "root")
    ?.loaderData as { origin: string } | undefined;
  return storefrontMeta({
    origin: rootData?.origin ?? "https://arrosticini.colagreco.dev",
    pathname: location.pathname,
    search: location.search,
    product: loaderData?.product,
    error: error != null || !loaderData,
  });
}

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!ProductSlug.safeParse(params.slug).success) throw new Response(null, { status: 404 });
  try {
    const product = await api(request).catalog.getProduct({ slug: params.slug });
    return { product, images: productImages(product) };
  } catch (error: unknown) {
    if (getApiError(error) === "PRODUCT_NOT_FOUND") throw new Response(null, { status: 404 });
    throw error;
  }
}

export default function Product({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("shop");
  const locale: Locale = i18n.language === "en" ? "en" : "it";
  const { product, images } = loaderData;
  return (
    <section className="catalog-page">
      <Breadcrumb
        items={[{ label: t("title"), to: `/${locale}/products` }, { label: product.name[locale] }]}
      />
      <div className="product-detail">
        <div className="product-gallery">
          <ProductImage src={images[0]} name={product.name[locale]} />
          {images.length > 1 && (
            <div className="product-thumbnails">
              {images.slice(1).map((image) => (
                <ProductImage key={image} src={image} name="" />
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{product.name[locale]}</h1>
          {product.pieces !== undefined && <p>{t("pieces", { count: product.pieces })}</p>}
          <p className="product-price">
            <Price cents={product.priceCents} locale={locale} />
          </p>
          <p className="product-description">{product.description[locale]}</p>
          <AddToCart slug={product.slug} />
        </div>
      </div>
    </section>
  );
}
