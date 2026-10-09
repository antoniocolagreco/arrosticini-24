import type { OrderStatus } from "@arrosticini/contracts";
import { useTranslation } from "react-i18next";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation("shop");
  return <span className={`status-badge status-${status.toLowerCase()}`}>{t(status)}</span>;
}
