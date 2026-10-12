import { useTranslation } from "react-i18next";
import { Breadcrumb } from "../components/breadcrumb.js";
import { PageTitle } from "../components/page-title.js";

export default function Story() {
  const { t } = useTranslation("common");
  return (
    <>
      <Breadcrumb items={[{ label: t("story") }]} />
      <article className="static-page shell">
        <div>
          <p className="eyebrow">Abruzzo</p>
          <PageTitle first={t("storyTitleFirst")} second={t("storyTitleSecond")} />
          <p className="lead">{t("storyIntro")}</p>
          <p>{t("storyBody")}</p>
        </div>
        <img src="/images/town.webp" alt="" width="420" height="320" />
      </article>
    </>
  );
}
