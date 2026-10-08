import { ChevronDown, Globe } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation } from "react-router";

export function SiteLayout({ children, version }: { children: ReactNode; version: string }) {
  const { t, i18n } = useTranslation("common");
  const location = useLocation();
  const locale: string = i18n.language === "en" ? "en" : "it";
  const other: string = locale === "it" ? "en" : "it";
  const segments: string[] = location.pathname.split("/");
  const languagePath: string =
    segments[1] === "it" || segments[1] === "en"
      ? `/${other}${segments.slice(2).length ? `/${segments.slice(2).join("/")}` : ""}`
      : `/${other}`;

  return (
    <>
      <a className="skip-link" href="#content">
        {t("skip")}
      </a>
      <header className="site-header shell">
        <Link className="brand" to={`/${locale}`} aria-label="Arrosticini 24ore">
          <img src="/images/sheep.webp" alt="" width="100" height="100" />
          <span>
            Arrosticini<strong>24ore</strong>
          </span>
        </Link>
        <nav className="main-nav" aria-label={t("home")}>
          <NavLink to={`/${locale}/products`}>{t("products")}</NavLink>
          <NavLink to={`/${locale}/story`}>{t("story")}</NavLink>
          <NavLink to={`/${locale}/delivery`}>{t("delivery")}</NavLink>
        </nav>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="language-link" type="button" aria-label={t("language")}>
              <Globe aria-hidden="true" size={20} />
              <span>{locale.toUpperCase()} / EUR</span>
              <ChevronDown className="language-chevron" aria-hidden="true" size={16} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="language-menu" align="end" sideOffset={8}>
              <DropdownMenu.Item asChild>
                <Link
                  to={`${location.pathname}${location.search}${location.hash}`}
                  aria-current="true"
                >
                  {locale === "it" ? "Italiano" : "English"}
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link to={`${languagePath}${location.search}${location.hash}`}>
                  {other === "it" ? "Italiano" : "English"}
                </Link>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </header>
      <main id="content">{children}</main>
      <footer className="site-footer shell">
        <span className="footer-tag">{t("footer")}</span>
        <span className="footer-meta">
          {t("demo")} · {version}
        </span>
      </footer>
    </>
  );
}
