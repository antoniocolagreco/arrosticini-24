import { type ProductDto, ProductStatus } from "@arrosticini/contracts";
import { Archive, CircleCheck, Package, Pencil, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { data, Form, Link, useFetcher, useNavigation } from "react-router";
import { Breadcrumb } from "../components/breadcrumb.js";
import { FormAlert } from "../components/form-alert.js";
import { Price } from "../components/price.js";
import { ProductImage } from "../components/product-image.js";
import { Button } from "../components/ui/button.js";
import { api } from "../lib/api.server.js";
import { catalogAdminAction, requireAdmin } from "../lib/catalog-admin.server.js";
import { productImages } from "../lib/product.server.js";
import type { Route } from "./+types/admin-products.js";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = requireAdmin(context, params.lang);
  const url: URL = new URL(request.url);
  const query: string = url.searchParams.get("q")?.trim() ?? "";
  const status: string = url.searchParams.get("status") ?? "";
  const parsedStatus = ProductStatus.safeParse(status);
  if (query.length > 100 || (status && !parsedStatus.success))
    return data({ items: [], query, status, invalidSearch: true }, { status: 400 });
  const { items } = await api(request, {
    userId: user.userId,
    role: user.role,
  }).catalog.listProducts({
    ...(query ? { q: query } : {}),
    ...(parsedStatus.success ? { status: parsedStatus.data } : {}),
  });
  return {
    items: items.map((product: ProductDto) => ({ product, image: productImages(product)[0] })),
    query,
    status,
    invalidSearch: false,
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  return catalogAdminAction(request, context, params.lang === "en" ? "en" : "it");
}

export default function AdminProducts({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("admin");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  const fetcher = useFetcher<typeof action>();
  const navigation = useNavigation();
  const busy: boolean = fetcher.state !== "idle";
  const archived = fetcher.data?.archived;
  return (
    <section className="catalog-page admin-page">
      <Breadcrumb
        items={[
          { label: t("account", { ns: "account" }), to: `/${locale}/account` },
          { label: t("catalog") },
        ]}
      />
      <div className="admin-heading">
        <div className="catalog-heading">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("catalog")}</h1>
          <p className="catalog-intro">{t("intro")}</p>
        </div>
        <Button asChild>
          <Link to={`/${locale}/admin/products/new`}>
            <Plus aria-hidden="true" />
            {t("newProduct")}
          </Link>
        </Button>
      </div>
      <Form
        method="get"
        className="admin-filters"
        role="search"
        aria-busy={navigation.state !== "idle"}
      >
        <div className="product-search">
          <label className="sr-only" htmlFor="admin-search">
            {t("search")}
          </label>
          <Search size={20} aria-hidden="true" />
          <input
            key={loaderData.query}
            id="admin-search"
            name="q"
            type="search"
            defaultValue={loaderData.query}
            maxLength={100}
            placeholder={t("searchPlaceholder")}
          />
        </div>
        <div className="form-field">
          <label className="sr-only" htmlFor="admin-status">
            {t("status")}
          </label>
          <select
            key={loaderData.status}
            id="admin-status"
            name="status"
            defaultValue={loaderData.status}
          >
            <option value="">{t("allStatuses")}</option>
            {ProductStatus.options.map((status) => (
              <option key={status} value={status}>
                {t(status)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline" busy={navigation.state !== "idle"}>
          {t("filter")}
        </Button>
      </Form>
      {loaderData.invalidSearch && <FormAlert message={t("invalidForm")} />}
      {fetcher.data?.error && <FormAlert message={t(fetcher.data.error)} />}
      <div className="admin-feedback" aria-live="polite">
        {archived && (
          <div className="admin-notice">
            <CircleCheck size={20} aria-hidden="true" />
            <span>{t("archived", { name: archived.name[locale] })}</span>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="restore" />
              <input type="hidden" name="slug" value={archived.slug} />
              <input type="hidden" name="status" value={archived.status} />
              <Button type="submit" variant="outline" busy={busy}>
                {t("undo")}
              </Button>
            </fetcher.Form>
          </div>
        )}
        {fetcher.data?.success === "restored" && (
          <p className="admin-notice">
            <CircleCheck size={20} aria-hidden="true" />
            {t("restored")}
          </p>
        )}
      </div>
      <p className="catalog-count" role="status">
        {t("results", { count: loaderData.items.length })}
      </p>
      <section
        className="admin-table-wrap"
        aria-label={t("catalog")}
        aria-busy={busy || navigation.state !== "idle"}
      >
        {loaderData.items.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <span className="sr-only">{t("image")}</span>
                </th>
                <th scope="col">{t("product")}</th>
                <th scope="col" className="num">
                  {t("pieces")}
                </th>
                <th scope="col" className="num">
                  {t("price")}
                </th>
                <th scope="col">{t("status")}</th>
                <th scope="col" className="num">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loaderData.items.map(({ product, image }) => (
                <tr key={product.slug}>
                  <td>
                    <div className="admin-thumb">
                      <ProductImage src={image} name="" />
                    </div>
                  </td>
                  <th scope="row" className="admin-product-name">
                    <Link to={`/${locale}/admin/products/${product.slug}`}>
                      {product.name[locale]}
                    </Link>
                    <small>{product.name[locale === "it" ? "en" : "it"]}</small>
                  </th>
                  <td className="num">{product.pieces ?? "—"}</td>
                  <td className="num">
                    <Price cents={product.priceCents} locale={locale} />
                  </td>
                  <td>
                    <span className={`status-badge product-status-${product.status.toLowerCase()}`}>
                      {t(product.status)}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Link
                        className="admin-icon"
                        to={`/${locale}/admin/products/${product.slug}`}
                        aria-label={t("edit", { name: product.name[locale] })}
                      >
                        <Pencil size={20} aria-hidden="true" />
                      </Link>
                      {product.status !== "ARCHIVED" && (
                        <fetcher.Form method="post">
                          <input type="hidden" name="intent" value="archive" />
                          <input type="hidden" name="slug" value={product.slug} />
                          <button
                            className="admin-icon"
                            type="submit"
                            disabled={busy}
                            aria-busy={busy}
                            aria-label={t("archive", { name: product.name[locale] })}
                          >
                            <Archive size={20} aria-hidden="true" />
                          </button>
                        </fetcher.Form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="catalog-empty">
            <Package size={48} aria-hidden="true" />
            <h2>{t("emptyTitle")}</h2>
            <p>{t("empty")}</p>
            {(loaderData.query || loaderData.status) && (
              <Button variant="outline" asChild>
                <Link to={`/${locale}/admin/products`}>{t("clear")}</Link>
              </Button>
            )}
          </div>
        )}
      </section>
      <span className="sr-only" role="status">
        {busy ? t("working") : ""}
      </span>
    </section>
  );
}
