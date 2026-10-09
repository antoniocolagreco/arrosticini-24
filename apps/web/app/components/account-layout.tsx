import {
  ClipboardList,
  CreditCard,
  LogOut,
  type LucideIcon,
  MapPin,
  Package,
  Settings,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Form, NavLink, useNavigation, useRouteLoaderData } from "react-router";
import type { loader } from "../root.js";
import { Breadcrumb } from "./breadcrumb.js";

export function AccountLayout({
  crumbs,
  eyebrow,
  title,
  intro,
  children,
}: {
  crumbs: { label: string; to?: string }[];
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
}) {
  const { t, i18n } = useTranslation("account");
  const navigation = useNavigation();
  const root = useRouteLoaderData<typeof loader>("root");
  const base: string = `/${i18n.language === "en" ? "en" : "it"}`;
  const links: { to: string; label: string; Icon: LucideIcon; end?: boolean }[] = [
    { to: `${base}/account`, label: t("navProfile"), Icon: UserRound, end: true },
    { to: `${base}/orders`, label: t("navOrders"), Icon: Package },
    { to: `${base}/account/addresses`, label: t("navAddresses"), Icon: MapPin },
    { to: `${base}/account/payment-methods`, label: t("paymentMethods"), Icon: CreditCard },
  ];
  if (root?.isAdmin)
    links.push(
      { to: `${base}/admin/orders`, label: t("allOrders", { ns: "admin" }), Icon: ClipboardList },
      { to: `${base}/admin/products`, label: t("catalog", { ns: "admin" }), Icon: Settings },
      { to: `${base}/admin/users`, label: t("users", { ns: "admin" }), Icon: UsersRound },
    );
  return (
    <section className="catalog-page account-area">
      <Breadcrumb
        items={
          crumbs.length
            ? [{ label: t("account"), to: `${base}/account` }, ...crumbs]
            : [{ label: t("account") }]
        }
      />
      <div className="catalog-heading">
        <p className="eyebrow">{eyebrow ?? t("eyebrow")}</p>
        <h1>{title}</h1>
        {intro && <div className="catalog-intro">{intro}</div>}
      </div>
      <div className="account-layout">
        <nav className="account-nav" aria-label={t("accountNav")}>
          <ul>
            {links.map(({ to, label, Icon, end }) => (
              <li key={to}>
                <NavLink className="account-nav-link" to={to} end={end ?? false}>
                  <Icon className="account-nav-icon" size={20} aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <Form method="post" action={`${base}/logout`}>
            <button
              type="submit"
              className="account-nav-link"
              disabled={navigation.state !== "idle"}
            >
              <LogOut className="account-nav-icon" size={20} aria-hidden="true" />
              {t("logout")}
            </button>
          </Form>
        </nav>
        <div className="account-content">{children}</div>
      </div>
    </section>
  );
}
