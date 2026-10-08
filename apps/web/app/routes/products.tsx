import type { ProductDto } from "@arrosticini/contracts";
import { CircleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { data, Link, useNavigation } from "react-router";
import { Breadcrumb } from "../components/breadcrumb.js";
import { ProductCard } from "../components/product-card.js";
import { ProductSearch } from "../components/product-search.js";
import { Button } from "../components/ui/button.js";
import { api, getApiError } from "../lib/api.server.js";
import { productImages } from "../lib/product.server.js";
import type { Route } from "./+types/products.js";

export async function loader({ request }: Route.LoaderArgs) {
  const query: string = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  try {
    const { items } = await api(request).catalog.listProducts(query ? { q: query } : {});
    return data({
      items: items.map((product: ProductDto) => ({ product, image: productImages(product)[0] })),
      query,
      invalidSearch: false,
    });
  } catch (error: unknown) {
    if (getApiError(error) !== "BAD_REQUEST") throw error;
    return data({ items: [], query, invalidSearch: true }, { status: 400 });
  }
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("shop");
  const navigation = useNavigation();
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);
  const loading: boolean = navigation.state !== "idle";
  useEffect(() => {
    if (!loading) {
      setShowSkeleton(false);
      return;
    }
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => setShowSkeleton(true), 300);
    return () => clearTimeout(timer);
  }, [loading]);
  return (
    <section className="catalog-page">
      <div className="catalog-heading">
        <Breadcrumb items={[{ label: t("title") }]} />
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>
          <span>{t("titleFirst")}</span> <span>{t("titleSecond")}</span>
        </h1>
        <p className="catalog-intro">{t("intro")}</p>
      </div>
      <div className="catalog-toolbar">
        <ProductSearch
          query={loaderData.query}
          loading={loading}
          invalidSearch={loaderData.invalidSearch}
        />
      </div>
      {loaderData.invalidSearch ? (
        <p className="catalog-alert" id="search-error" role="alert">
          <CircleAlert aria-hidden="true" size={20} />
          {t("invalidSearch")}
        </p>
      ) : (
        <p className="catalog-count" role="status">
          {t("results", { count: loaderData.items.length })}
        </p>
      )}
      {showSkeleton ? (
        <div className="product-grid" role="status" aria-busy="true" aria-label={t("loading")}>
          {Array.from({ length: 8 }, (_, index: number) => (
            <div className="product-card product-skeleton" key={index} aria-hidden="true">
              <span className="skeleton-media" />
              <div className="product-card-body">
                <span className="skeleton-title" />
                <span className="skeleton-line" />
                <span className="skeleton-price" />
              </div>
            </div>
          ))}
        </div>
      ) : loaderData.items.length > 0 ? (
        <div className="product-grid" aria-busy={loading}>
          {loaderData.items.map(({ product, image }) => (
            <ProductCard key={product.slug} product={product} image={image} />
          ))}
        </div>
      ) : !loaderData.invalidSearch ? (
        <div className="catalog-empty">
          <img src="/images/sheep.webp" alt="" width="112" height="112" />
          <h2>
            {loaderData.query
              ? t("emptySearchTitle", { query: loaderData.query })
              : t("emptyTitle")}
          </h2>
          <p>{loaderData.query ? t("emptySearch") : t("emptyCatalog")}</p>
          {loaderData.query && (
            <Button variant="outline" asChild>
              <Link to={`/${i18n.language}/products`}>{t("clearSearch")}</Link>
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}
