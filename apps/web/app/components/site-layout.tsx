import { ChevronDown, Globe } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation } from "react-router";
import { Logo } from "./logo.js";

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
        <Logo locale={locale} />
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
        <div className="footer-main">
          <div className="footer-brand">
            <Logo locale={locale} size="sm" />
            <p className="footer-tag">{t("footer")}</p>
            <p className="footer-about">{t("footerAbout")}</p>
          </div>
          <nav className="footer-column" aria-labelledby="footer-shop">
            <h2 id="footer-shop">{t("footerShop")}</h2>
            <Link to={`/${locale}/products`}>{t("footerAllProducts")}</Link>
            <Link to={`/${locale}/products?q=arrosticini`}>Arrosticini</Link>
          </nav>
          <nav className="footer-column" aria-labelledby="footer-company">
            <h2 id="footer-company">Arrosticini 24ore</h2>
            <Link to={`/${locale}/story`}>{t("story")}</Link>
            <Link to={`/${locale}/delivery`}>{t("delivery")}</Link>
          </nav>
          <nav className="footer-column" aria-labelledby="footer-language">
            <h2 id="footer-language">{t("footerLanguage")}</h2>
            <Link
              to={`${locale === "it" ? location.pathname : languagePath}${location.search}`}
              aria-current={locale === "it" ? "true" : undefined}
            >
              Italiano
            </Link>
            <Link
              to={`${locale === "en" ? location.pathname : languagePath}${location.search}`}
              aria-current={locale === "en" ? "true" : undefined}
            >
              English
            </Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Arrosticini 24ore · {t("footerDemo")}</p>
          <p>{t("footerVersion", { version })}</p>
        </div>
      </footer>
    </>
  );
}
