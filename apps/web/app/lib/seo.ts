import type { ProductDto } from "@arrosticini/contracts";
import type { Locale } from "@arrosticini/kernel";
import type { MetaDescriptor } from "react-router";

export const storefrontPaths: readonly string[] = ["", "/products", "/story", "/delivery"];

const pageCopy: Record<Locale, Record<string, { title: string; description: string }>> = {
  it: {
    "": {
      title: "Arrosticini abruzzesi online | Arrosticini 24ore",
      description:
        "Acquista arrosticini d’Abruzzo, vini e accessori per la brace. Scegli il tuo formato e porta la tradizione abruzzese a tavola con Arrosticini 24ore.",
    },
    "/products": {
      title: "Arrosticini, vini e accessori per la brace | Arrosticini 24ore",
      description:
        "Scopri il catalogo di Arrosticini 24ore: arrosticini abruzzesi in diversi formati, vini e accessori per la cottura. Scegli i prodotti per la tua grigliata.",
    },
    "/story": {
      title: "La tradizione degli arrosticini d’Abruzzo | Arrosticini 24ore",
      description:
        "Scopri la storia degli arrosticini abruzzesi, la cottura sulla fornacella e la tradizione che ispira Arrosticini 24ore.",
    },
    "/delivery": {
      title: "Spedizioni e consegna degli arrosticini | Arrosticini 24ore",
      description:
        "Informazioni sulle spedizioni di Arrosticini 24ore: scopri come viaggiano gli arrosticini d’Abruzzo e consulta i dettagli della consegna.",
    },
  },
  en: {
    "": {
      title: "Buy Abruzzo arrosticini online | Arrosticini 24ore",
      description:
        "Shop traditional arrosticini from Abruzzo, wines and grilling accessories. Choose your pack and bring Abruzzo’s food tradition to your table with Arrosticini 24ore.",
    },
    "/products": {
      title: "Arrosticini, wines and grilling accessories | Arrosticini 24ore",
      description:
        "Browse Arrosticini 24ore: traditional Abruzzo lamb skewers in different pack sizes, wines and grilling accessories. Find everything for your next barbecue.",
    },
    "/story": {
      title: "The tradition of Abruzzo arrosticini | Arrosticini 24ore",
      description:
        "Discover Abruzzo’s arrosticini tradition, cooking over charcoal on a fornacella and the food culture behind Arrosticini 24ore.",
    },
    "/delivery": {
      title: "Arrosticini shipping and delivery | Arrosticini 24ore",
      description:
        "Explore shipping information from Arrosticini 24ore. Learn how arrosticini from Abruzzo travel and find details about delivery.",
    },
  },
};

interface StorefrontMetadata {
  origin: string;
  pathname: string;
  search: string;
  product?: ProductDto;
  error?: boolean;
}

export function storefrontMeta({
  origin,
  pathname,
  search,
  product,
  error = false,
}: StorefrontMetadata): MetaDescriptor[] {
  const locale: Locale = pathname.split("/")[1] === "en" ? "en" : "it";
  const suffix: string = pathname.replace(/^\/(it|en)/, "").replace(/\/$/, "");
  const copy: { title: string; description: string } | undefined = pageCopy[locale][suffix];
  const isProduct: boolean =
    !!product && product.status === "ACTIVE" && suffix === `/products/${product.slug}`;
  const params: URLSearchParams = new URLSearchParams(search);
  const indexable: boolean =
    !error &&
    /^\/(it|en)(\/|$)/.test(pathname) &&
    (!!copy || isProduct) &&
    !params.has("q") &&
    !params.has("cursor");
  const title: string = error
    ? locale === "it"
      ? "Pagina non disponibile | Arrosticini 24ore"
      : "Page unavailable | Arrosticini 24ore"
    : isProduct && product
      ? `${product.name[locale]} | Arrosticini 24ore`
      : (copy?.title ?? "Arrosticini 24ore");
  const description: string =
    isProduct && product
      ? product.description[locale].replace(/\s+/g, " ").trim().slice(0, 160)
      : (copy?.description ?? pageCopy[locale][""]?.description ?? "");
  const canonical: string = new URL(`/${locale}${suffix}`, origin).href;
  const productImages: string[] =
    isProduct && product
      ? product.images.map(({ key }) => new URL(`/images/${key}`, origin).href)
      : [];
  const image: string = productImages[0] ?? new URL("/images/social-card.png", origin).href;
  const imageAlt: string =
    isProduct && product
      ? product.name[locale]
      : locale === "it"
        ? "Arrosticini 24ore: arrosticini d’Abruzzo, direzione mondo"
        : "Arrosticini 24ore: from Abruzzo to the world";
  const metadata: MetaDescriptor[] = [
    { title },
    { name: "description", content: description },
    {
      name: "robots",
      content: indexable ? "index, follow, max-image-preview:large" : "noindex, follow",
    },
    { property: "og:site_name", content: "Arrosticini 24ore" },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { property: "og:locale", content: locale === "it" ? "it_IT" : "en_GB" },
    { property: "og:locale:alternate", content: locale === "it" ? "en_GB" : "it_IT" },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: imageAlt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: imageAlt },
  ];
  if (productImages.length === 0) {
    metadata.push(
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
    );
  }
  if (!error && (copy || isProduct)) {
    metadata.push({ tagName: "link", rel: "canonical", href: canonical });
  }
  if (indexable) {
    metadata.push(
      {
        tagName: "link",
        rel: "alternate",
        hrefLang: "it",
        href: new URL(`/it${suffix}`, origin).href,
      },
      {
        tagName: "link",
        rel: "alternate",
        hrefLang: "en",
        href: new URL(`/en${suffix}`, origin).href,
      },
      {
        tagName: "link",
        rel: "alternate",
        hrefLang: "x-default",
        href: new URL(`/it${suffix}`, origin).href,
      },
    );
    if (suffix === "") {
      metadata.push({
        "script:ld+json": {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${origin}/#organization`,
              name: "Arrosticini 24ore",
              url: origin,
            },
            {
              "@type": "WebSite",
              "@id": `${origin}/#website`,
              name: "Arrosticini 24ore",
              url: origin,
              inLanguage: ["it", "en"],
              publisher: { "@id": `${origin}/#organization` },
            },
          ],
        },
      });
    }
    if (isProduct && product) {
      metadata.push({
        "script:ld+json": {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name[locale],
          description: product.description[locale],
          sku: product.slug,
          url: canonical,
          ...(productImages.length > 0 ? { image: productImages } : {}),
          offers: {
            "@type": "Offer",
            url: canonical,
            priceCurrency: product.currency,
            price: (product.priceCents / 100).toFixed(2),
            seller: { "@type": "Organization", name: "Arrosticini 24ore" },
          },
        },
      });
      metadata.push({
        "script:ld+json": {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: new URL(`/${locale}`, origin).href,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: locale === "it" ? "Prodotti" : "Products",
              item: new URL(`/${locale}/products`, origin).href,
            },
            { "@type": "ListItem", position: 3, name: product.name[locale], item: canonical },
          ],
        },
      });
    }
  }
  return metadata;
}
