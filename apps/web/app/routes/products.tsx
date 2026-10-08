import type { ProductDto } from "@arrosticini/contracts";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, Form, Link, useNavigation } from "react-router";
import { ProductCard } from "../components/product-card.js";
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
  return (
    <section className="catalog-page">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1>{t("title")}</h1>
      <p className="catalog-intro">{t("intro")}</p>
      <Form
        className="product-search"
        method="get"
        role="search"
        aria-busy={navigation.state !== "idle"}
      >
        <label htmlFor="product-query">{t("searchLabel")}</label>
        <div>
          <input
            key={loaderData.query}
            id="product-query"
            name="q"
            type="search"
            defaultValue={loaderData.query}
            maxLength={100}
            placeholder={t("searchPlaceholder")}
            aria-invalid={loaderData.invalidSearch}
            aria-describedby={loaderData.invalidSearch ? "search-error" : undefined}
          />
          <Button type="submit" disabled={navigation.state !== "idle"}>
            <Search aria-hidden="true" size={20} />
            {t("search")}
          </Button>
        </div>
      </Form>
      {loaderData.invalidSearch ? (
        <p id="search-error" role="alert">
          {t("invalidSearch")}
        </p>
      ) : (
        <p className="catalog-count" role="status">
          {t("results", { count: loaderData.items.length })}
        </p>
      )}
      {loaderData.items.length > 0 ? (
        <div className="product-grid">
          {loaderData.items.map(({ product, image }) => (
            <ProductCard key={product.slug} product={product} image={image} />
          ))}
        </div>
      ) : !loaderData.invalidSearch ? (
        <div className="catalog-empty">
          <h2>{t("emptyTitle")}</h2>
          <p>{loaderData.query ? t("emptySearch") : t("emptyCatalog")}</p>
          {loaderData.query && <Link to={`/${i18n.language}/products`}>{t("clearSearch")}</Link>}
        </div>
      ) : null}
    </section>
  );
}
