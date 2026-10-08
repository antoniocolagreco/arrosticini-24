import { useTranslation } from "react-i18next";

export default function Story() {
  const { t } = useTranslation("common");
  return (
    <article className="static-page shell">
      <div>
        <p className="eyebrow">Abruzzo</p>
        <h1>{t("storyTitle")}</h1>
        <p className="lead">{t("storyIntro")}</p>
        <p>{t("storyBody")}</p>
      </div>
      <img src="/images/town.webp" alt="" width="420" height="320" />
    </article>
  );
}
