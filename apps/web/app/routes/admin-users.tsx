import { UserStatus } from "@arrosticini/contracts";
import { useTranslation } from "react-i18next";
import { data, Form, Link, useNavigation } from "react-router";
import { AccountLayout } from "../components/account-layout.js";
import { Pager } from "../components/pager.js";
import { Button } from "../components/ui/button.js";
import { api } from "../lib/api.server.js";
import { requireAdmin } from "../lib/catalog-admin.server.js";
import { loadPage, readCursor } from "../lib/pagination.server.js";
import type { Route } from "./+types/admin-users.js";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = requireAdmin(context, params.lang);
  const status: string = new URL(request.url).searchParams.get("status") ?? "";
  const parsedStatus = UserStatus.safeParse(status);
  if (status && !parsedStatus.success) throw data(null, { status: 400 });
  const cursor: string | undefined = readCursor(request);
  const page = await loadPage(() =>
    api(request, { userId: user.userId, role: user.role }).identity.listUsers({
      ...(parsedStatus.success ? { status: parsedStatus.data } : {}),
      ...(cursor ? { cursor } : {}),
    }),
  );
  return { ...page, status };
}

export default function AdminUsers({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation("admin");
  const locale: "it" | "en" = i18n.language === "en" ? "en" : "it";
  const navigation = useNavigation();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  return (
    <AccountLayout
      crumbs={[{ label: t("users") }]}
      eyebrow={t("eyebrow")}
      title={t("users")}
      intro={t("usersIntro")}
    >
      <Form method="get" className="admin-filters" aria-busy={navigation.state !== "idle"}>
        <div className="form-field">
          <label className="sr-only" htmlFor="admin-user-status">
            {t("status")}
          </label>
          <select
            key={loaderData.status}
            id="admin-user-status"
            name="status"
            defaultValue={loaderData.status}
          >
            <option value="">{t("allStatuses")}</option>
            {UserStatus.options.map((status) => (
              <option key={status} value={status}>
                {t(`user${status}`)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline" busy={navigation.state !== "idle"}>
          {t("filterUsers")}
        </Button>
      </Form>
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
      <Pager nextCursor={loaderData.nextCursor} />
    </AccountLayout>
  );
}
