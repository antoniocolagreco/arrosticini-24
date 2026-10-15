import { PRODUCT_IMAGE_TYPES, type ProductDto, ProductStatus } from "@arrosticini/contracts";
import { CircleCheck, ExternalLink, ImagePlus, Save, Trash2 } from "lucide-react";
import { type RefObject, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Form, Link, useFetcher, useNavigation } from "react-router";
import type { CatalogAdminResult } from "../lib/catalog-admin.server.js";
import { AccountLayout } from "./account-layout.js";
import { FormAlert } from "./form-alert.js";
import { FormField } from "./form-field.js";
import { ProductImage } from "./product-image.js";
import { Button } from "./ui/button.js";

export function ProductEditor({
  product,
  images = [],
  result,
  created = false,
}: {
  product?: ProductDto;
  images?: string[];
  result?: CatalogAdminResult;
  created?: boolean;
}) {
  const { t, i18n } = useTranslation("admin");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  const navigation = useNavigation();
  const fetcher = useFetcher<CatalogAdminResult>();
  const busy: boolean = navigation.state !== "idle" || fetcher.state !== "idle";
  const form: RefObject<HTMLFormElement | null> = useRef<HTMLFormElement>(null);
  const upload: RefObject<HTMLFormElement | null> = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (result && (result.error || Object.keys(result.errors).length > 0))
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
  }, [result]);
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success === "imageAdded") upload.current?.reset();
  }, [fetcher.state, fetcher.data]);
  function value(name: string, fallback: string): string {
    return result?.values[name] ?? fallback;
  }
  return (
    <AccountLayout
      crumbs={[
        { label: t("catalog"), to: `/${locale}/admin/products` },
        { label: product ? product.name[locale] : t("newProduct") },
      ]}
      eyebrow={t("eyebrow")}
      title={product ? t("editProduct") : t("newProduct")}
      intro={product ? product.name[locale] : t("detailsIntro")}
      actions={
        product?.status === "ACTIVE" && (
          <Button asChild variant="outline">
            <Link to={`/${locale}/products/${product.slug}`}>
              <ExternalLink aria-hidden="true" />
              {t("preview")}
            </Link>
          </Button>
        )
      }
    >
      <Form
        method="post"
        ref={form}
        className="admin-editor"
        noValidate
        aria-busy={navigation.state !== "idle"}
      >
        <input type="hidden" name="intent" value="save" />
        <div className="admin-editor-main">
          {result?.error && <FormAlert message={t(result.error)} />}
          {(result?.success === "saved" || created) && (
            <p className="admin-notice" role="status">
              <CircleCheck size={20} aria-hidden="true" />
              {t(result?.success === "saved" ? "saved" : "created")}
            </p>
          )}
          <section className="admin-panel">
            <h2>{t("details")}</h2>
            <p className="admin-panel-intro">{t("detailsIntro")}</p>
            <div className="admin-language-grid">
              {(["it", "en"] as const).map((language) => {
                const suffix: "It" | "En" = language === "it" ? "It" : "En";
                const name: string = `name${suffix}`;
                const description: string = `description${suffix}`;
                const error: string | undefined = result?.errors[description];
                return (
                  <fieldset key={language} className="admin-language">
                    <legend>{t(language === "it" ? "italian" : "english")}</legend>
                    <FormField
                      id={name}
                      name={name}
                      label={t("name")}
                      maxLength={120}
                      required
                      defaultValue={value(name, product?.name[language] ?? "")}
                      {...(result?.errors[name] ? { error: t(result.errors[name]) } : {})}
                    />
                    <div className="form-field">
                      <label htmlFor={description}>{t("description")}</label>
                      <textarea
                        id={description}
                        name={description}
                        rows={7}
                        maxLength={2000}
                        required
                        defaultValue={value(description, product?.description[language] ?? "")}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${description}-error` : undefined}
                      />
                      {error && (
                        <p id={`${description}-error`} className="field-error">
                          {t(error)}
                        </p>
                      )}
                    </div>
                  </fieldset>
                );
              })}
            </div>
            <FormField
              id="slug"
              name="slug"
              label={t("slug")}
              defaultValue={value("slug", product?.slug ?? "")}
              readOnly={Boolean(product)}
              required
              maxLength={64}
              autoCapitalize="none"
              spellCheck={false}
              hint={product ? `/${locale}/products/${product.slug}` : t("slugHint")}
              {...(result?.errors.slug ? { error: t(result.errors.slug) } : {})}
            />
          </section>
        </div>
        <aside className="admin-panel admin-selling">
          <h2>{t("selling")}</h2>
          <FormField
            id="price"
            name="price"
            label={t("priceEuro")}
            inputMode="decimal"
            required
            defaultValue={value("price", product ? (product.priceCents / 100).toFixed(2) : "")}
            {...(result?.errors.price ? { error: t(result.errors.price) } : {})}
          />
          <FormField
            id="pieces"
            name="pieces"
            label={t("optionalPieces")}
            type="number"
            min={1}
            step={1}
            defaultValue={value("pieces", product?.pieces?.toString() ?? "")}
            {...(result?.errors.pieces ? { error: t(result.errors.pieces) } : {})}
          />
          <div className="form-field">
            <label htmlFor="status">{t("status")}</label>
            <select
              id="status"
              name="status"
              defaultValue={value("status", product?.status ?? "DRAFT")}
              aria-invalid={result?.errors.status ? true : undefined}
              aria-describedby="status-message"
            >
              {ProductStatus.options.map((status) => (
                <option key={status} value={status}>
                  {t(status)}
                </option>
              ))}
            </select>
            <p id="status-message" className={result?.errors.status ? "field-error" : "field-hint"}>
              {t(result?.errors.status ?? "publicationHint")}
            </p>
          </div>
          <Button type="submit" busy={busy}>
            <Save aria-hidden="true" />
            {t("save")}
          </Button>
          <Link className="admin-back" to={`/${locale}/admin/products`}>
            {t("cancel")}
          </Link>
          <span className="sr-only" role="status">
            {navigation.state !== "idle" ? t("working") : ""}
          </span>
        </aside>
      </Form>
      <section className="admin-panel admin-images" aria-busy={fetcher.state !== "idle"}>
        <h2>{t("images")}</h2>
        <p className="admin-panel-intro">{t("imagesIntro")}</p>
        {product ? (
          <>
            {fetcher.data?.error && <FormAlert message={t(fetcher.data.error)} />}
            {fetcher.data?.success && (
              <p className="admin-notice" role="status">
                <CircleCheck size={20} aria-hidden="true" />
                {t(fetcher.data.success)}
              </p>
            )}
            {product.images.length > 0 ? (
              <ul className="admin-image-grid">
                {product.images.map((image, index) => (
                  <li key={image.id}>
                    <div className="admin-image">
                      <ProductImage src={images[index]} name="" />
                    </div>
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="removeImage" />
                      <input type="hidden" name="imageId" value={image.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        busy={busy}
                        aria-label={t("removeImage", { number: index + 1 })}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        {t("removeImage", { number: index + 1 })}
                      </Button>
                    </fetcher.Form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-no-images">
                <ImagePlus size={24} aria-hidden="true" />
                {t("noImages")}
              </p>
            )}
            <fetcher.Form
              method="post"
              encType="multipart/form-data"
              ref={upload}
              className="admin-upload"
            >
              <input type="hidden" name="intent" value="upload" />
              <FormField
                id="file"
                name="file"
                type="file"
                accept={PRODUCT_IMAGE_TYPES.join(",")}
                label={t("chooseImage")}
                hint={t("imageHint")}
                required
              />
              <Button type="submit" variant="outline" busy={busy}>
                <ImagePlus aria-hidden="true" />
                {t("upload")}
              </Button>
            </fetcher.Form>
            <span className="sr-only" role="status">
              {fetcher.state !== "idle" ? t("working") : ""}
            </span>
          </>
        ) : (
          <p className="admin-no-images">
            <ImagePlus size={24} aria-hidden="true" />
            {t("imagesAfterCreate")}
          </p>
        )}
      </section>
    </AccountLayout>
  );
}
