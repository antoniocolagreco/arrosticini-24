import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  const { t, i18n } = useTranslation("common");
  return (
    <nav className="breadcrumb" aria-label={t("breadcrumb")}>
      <Link to={`/${i18n.language}`}>{t("home")}</Link>
      {items.map(({ label, to }) => (
        <Fragment key={label}>
          <span aria-hidden="true">/</span>
          {to ? <Link to={to}>{label}</Link> : <span aria-current="page">{label}</span>}
        </Fragment>
      ))}
    </nav>
  );
}
