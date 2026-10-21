import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { Button } from "./ui/button.js";

export function Pager({ nextCursor }: { nextCursor?: string | undefined }) {
  const { t } = useTranslation("common");
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const onFirstPage: boolean = !params.has("cursor");
  if (onFirstPage && nextCursor === undefined) return null;
  params.delete("cursor");
  const firstPage: string = params.size ? `${pathname}?${params}` : pathname;
  if (nextCursor !== undefined) params.set("cursor", nextCursor);
  return (
    <nav className="pager" aria-label={t("pagination")}>
      {!onFirstPage && (
        <Button variant="outline" asChild>
          <Link to={firstPage}>{t("firstPage")}</Link>
        </Button>
      )}
      {nextCursor !== undefined && (
        <Button asChild>
          <Link to={`${pathname}?${params}`}>{t("nextPage")}</Link>
        </Button>
      )}
    </nav>
  );
}
