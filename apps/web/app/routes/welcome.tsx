import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "../components/ui/button.js";

export default function Welcome() {
  const { t, i18n } = useTranslation("common");
  const reducedMotion = useReducedMotion();
  return (
    <>
      <section className="hero">
        <div className="hero-landscape" />
        <div className="shell hero-content">
          <p className="eyebrow">{t("tagline")}</p>
          <h1>
            <span>{t("headlineFirst")}</span>
            <span>{t("headlineSecond")}</span>
          </h1>
          <p className="hero-intro">{t("intro")}</p>
          <Button asChild size="lg">
            <Link to={`/${i18n.language}/story`}>
              {t("discover")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <motion.img
          className="hero-airplane"
          src="/images/airplane.webp"
          alt=""
          width="900"
          height="540"
          animate={reducedMotion ? {} : { y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
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
    </>
  );
}
