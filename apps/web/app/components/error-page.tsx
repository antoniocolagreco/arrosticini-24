import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "./ui/button.js";

export function ErrorPage({ status, requestId }: { status: number; requestId?: string }) {
  const { t, i18n } = useTranslation("errors");
  const notFound: boolean = status === 404;
  return (
    <section className="error-page shell">
      <img src="/images/sheep_overdrive_on.webp" alt="" width="280" height="280" />
      <p className="eyebrow">{status}</p>
      <h1>{t(notFound ? "notFoundTitle" : "unexpectedTitle")}</h1>
      <p>{t(notFound ? "notFoundBody" : "unexpectedBody")}</p>
      <Button asChild>
        <Link to={`/${i18n.language === "en" ? "en" : "it"}`}>{t("backHome")}</Link>
      </Button>
      {!notFound && requestId && (
        <p className="request-id">
          {t("requestId")}: {requestId}
        </p>
      )}
    </section>
  );
}
