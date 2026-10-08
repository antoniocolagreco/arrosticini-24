import { useTranslation } from "react-i18next";

export default function Delivery() {
  const { t } = useTranslation("common");
  return (
    <article className="static-page shell">
      <div>
        <p className="eyebrow">Arrosticini 24ore</p>
        <h1>{t("deliveryTitle")}</h1>
        <p className="lead">{t("deliveryIntro")}</p>
        <p>{t("deliveryBody")}</p>
      </div>
      <img src="/images/box.webp" alt="" width="360" height="320" />
    </article>
  );
}
