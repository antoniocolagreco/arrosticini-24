import { ArrowRight } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "../components/ui/button.js";

export default function Welcome() {
  const { t, i18n } = useTranslation("common");
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 70, damping: 24 });
  const y = useSpring(pointerY, { stiffness: 70, damping: 24 });

  function moveScene(event: PointerEvent<HTMLElement>) {
    if (reducedMotion || event.pointerType !== "mouse") return;
    const bounds: DOMRect = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left - bounds.width / 2) / bounds.width) * 14);
    pointerY.set(((event.clientY - bounds.top - bounds.height / 2) / bounds.height) * 10);
  }

  return (
    <>
      <section
        className="hero"
        onPointerMove={moveScene}
        onPointerLeave={() => {
          pointerX.set(0);
          pointerY.set(0);
        }}
      >
        <div className="shell hero-content">
          <p className="eyebrow">{t("tagline")}</p>
          <h1>
            <span>{t("headlineFirst")}</span>
            <span>{t("headlineSecond")}</span>
          </h1>
          <p className="hero-intro">{t("intro")}</p>
          <Button asChild size="lg" className="hero-cta">
            <Link to={`/${i18n.language}/story`}>
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
          <motion.div className="hero-flight" style={{ x, y }}>
            <motion.img
              className="hero-airplane"
              src="/images/airplane.webp"
              alt=""
              width="1774"
              height="887"
              fetchPriority="high"
              animate={reducedMotion ? {} : { y: [0, -7, 0], rotate: [0, -0.4, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </section>
      <motion.section
        className="value-props shell"
        initial={false}
        whileInView={reducedMotion ? {} : { opacity: [0.65, 1], y: [12, 0] }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.65 }}
      >
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
      </motion.section>
    </>
  );
}
