import type { ProductDto } from "@arrosticini/contracts";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ProductCard } from "../components/product-card.js";
import { Button } from "../components/ui/button.js";
import { api } from "../lib/api.server.js";
import { productImages } from "../lib/product.server.js";
import type { Route } from "./+types/welcome.js";

export async function loader({ request }: Route.LoaderArgs) {
  const { items } = await api(request).catalog.listProducts({});
  return {
    featured: items
      .filter((product: ProductDto) => product.pieces !== undefined)
      .slice(0, 3)
      .map((product: ProductDto) => ({ product, image: productImages(product)[0] })),
  };
}

export default function Welcome({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("common");
  const reducedMotion = useReducedMotion();

  return (
    <>
      <section className="hero">
        <div className="shell hero-content">
          <p className="eyebrow">
            {t("taglineFirst")}
            <span className="eyebrow-dot" aria-hidden="true">
              ·
            </span>
            {t("taglineSecond")}
          </p>
          <h1>
            <span>{t("headlineFirst")}</span>
            <span>{t("headlineSecond")}</span>
          </h1>
          <p className="hero-intro">{t("intro")}</p>
          <Button asChild size="lg" className="hero-cta">
            <Link to={`/${i18n.language}/products`}>
              {t("discover")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <img
            className="hero-landscape"
            src="/images/background.webp"
            alt=""
            width="1774"
            height="887"
          />
          <div className="hero-flight">
            <motion.img
              className="hero-airplane"
              src="/images/airplane.webp"
              alt=""
              width="1774"
              height="887"
              fetchPriority="high"
              animate={reducedMotion ? {} : { y: [0, -8, 0], rotate: [0, -1, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </section>
      <section className="value-props shell">
        <div>
          <img src="/images/town.webp" alt="" width="130" height="90" />
          <span>
            <h2>{t("originTitle")}</h2>
            <p>{t("originText")}</p>
          </span>
        </div>
        <div>
          <img src="/images/box.webp" alt="" width="100" height="90" />
          <span>
            <h2>{t("coldTitle")}</h2>
            <p>{t("coldText")}</p>
          </span>
        </div>
        <div>
          <img src="/images/globe.webp" alt="" width="90" height="90" />
          <span>
            <h2>{t("worldTitle")}</h2>
            <p>{t("worldText")}</p>
          </span>
        </div>
      </section>
      {loaderData.featured.length > 0 && (
        <section className="featured" aria-labelledby="featured-title">
          <h2 className="section-title" id="featured-title">
            {t("featuredTitle")}
          </h2>
          <div className="featured-grid">
            {loaderData.featured.map(({ product, image }) => (
              <ProductCard key={product.slug} product={product} image={image} layout="row" />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
