import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Breadcrumb } from "../components/breadcrumb.js";
import { api } from "../lib/api.server.js";
import { requireAdmin } from "../lib/catalog-admin.server.js";
import type { Route } from "./+types/admin-users.js";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = requireAdmin(context, params.lang);
  return api(request, { userId: user.userId, role: user.role }).identity.listUsers();
}

export default function AdminUsers({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("admin");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  return (
    <section className="catalog-page admin-page">
      <Breadcrumb
        items={[
          { label: t("account", { ns: "account" }), to: `/${locale}/account` },
          { label: t("users") },
        ]}
      />
      <div className="catalog-heading">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("users")}</h1>
        <p className="catalog-intro">{t("usersIntro")}</p>
      </div>
      <p className="catalog-count" role="status">
        {t("userResults", { count: loaderData.items.length })}
      </p>
      <section className="admin-table-wrap" aria-label={t("users")}>
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">{t("customer")}</th>
              <th scope="col">{t("role")}</th>
              <th scope="col">{t("status")}</th>
              <th scope="col" className="num">
                {t("registeredAt")}
              </th>
            </tr>
          </thead>
          <tbody>
            {loaderData.items.map((user) => (
              <tr key={user.id}>
                <th scope="row" className="admin-product-name">
                  <Link to={`/${locale}/admin/users/${user.id}`}>
                    {user.firstName} {user.lastName}
                  </Link>
                  <small>{user.email}</small>
                </th>
                <td>{t(`${user.role}_role`)}</td>
                <td>
                  <span className={`status-badge user-status-${user.status.toLowerCase()}`}>
                    {t(`user${user.status}`)}
                  </span>
                </td>
                <td className="num">{date.format(new Date(user.createdAt))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}
