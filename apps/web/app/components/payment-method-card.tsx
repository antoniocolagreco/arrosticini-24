import type { PaymentMethodDto } from "@arrosticini/contracts";
import { CreditCard, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";
import type { PaymentMethodResult } from "../lib/payments.server.js";
import { FormAlert } from "./form-alert.js";

export function PaymentMethodCard({ method }: { method: PaymentMethodDto }) {
  const { t } = useTranslation("account");
  const fetcher = useFetcher<PaymentMethodResult>();
  const busy: boolean = fetcher.state !== "idle";
  return (
    <li className="tile" aria-busy={busy}>
      <div className="tile-head">
        <strong className="payment-method-brand">
          <CreditCard size={20} aria-hidden="true" />
          {method.brand}
        </strong>
      </div>
      <p className="payment-method-number">•••• {method.last4}</p>
      <p className="tile-meta">
        {t("cardExpires", {
          month: String(method.expMonth).padStart(2, "0"),
          year: method.expYear,
        })}
      </p>
      <div className="tile-actions">
        <fetcher.Form method="post" className="tile-icons">
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="id" value={method.id} />
          <button
            type="submit"
            className="icon-action icon-action-danger"
            disabled={busy}
            aria-busy={busy}
            title={t("removeCard")}
            aria-label={t("removeCardLabel", { brand: method.brand, last4: method.last4 })}
          >
            <Trash2 size={20} aria-hidden="true" />
          </button>
        </fetcher.Form>
      </div>
      {fetcher.data?.error && <FormAlert message={t(fetcher.data.error)} />}
    </li>
  );
}
