import { useTranslation } from "react-i18next";
import { Breadcrumb } from "../components/breadcrumb.js";
import { PageTitle } from "../components/page-title.js";

export default function Delivery() {
  const { t } = useTranslation("common");
  return (
    <>
      <Breadcrumb items={[{ label: t("delivery") }]} />
      <article className="static-page shell">
        <div>
          <p className="eyebrow">Arrosticini 24ore</p>
          <PageTitle first={t("deliveryTitleFirst")} second={t("deliveryTitleSecond")} />
          <p className="lead">{t("deliveryIntro")}</p>
          <p>{t("deliveryBody")}</p>
        </div>
        <img src="/images/box.webp" alt="" width="360" height="320" />
      </article>
    </>
  );
}
