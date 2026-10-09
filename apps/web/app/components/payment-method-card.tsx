import type { PaymentMethodDto } from "@arrosticini/contracts";
import { CreditCard, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";
import type { PaymentMethodResult } from "../lib/payments.server.js";
import { FormAlert } from "./form-alert.js";
import { Button } from "./ui/button.js";

export function PaymentMethodCard({ method }: { method: PaymentMethodDto }) {
  const { t } = useTranslation("account");
  const fetcher = useFetcher<PaymentMethodResult>();
  const busy: boolean = fetcher.state !== "idle";
  return (
    <li className="payment-method-card">
      <CreditCard size={28} aria-hidden="true" />
      <h2 className="payment-method-brand">{method.brand}</h2>
      <p className="payment-method-number">•••• {method.last4}</p>
      <p className="payment-method-expiry">
        {t("cardExpires", {
          month: String(method.expMonth).padStart(2, "0"),
          year: method.expYear,
        })}
      </p>
      <fetcher.Form method="post" aria-busy={busy}>
        <input type="hidden" name="intent" value="delete" />
        <input type="hidden" name="id" value={method.id} />
        <Button
          type="submit"
          variant="outline"
          busy={busy}
          aria-label={t("removeCardLabel", { brand: method.brand, last4: method.last4 })}
        >
          <Trash2 size={20} aria-hidden="true" />
          {t("removeCard")}
        </Button>
      </fetcher.Form>
      {fetcher.data?.error && <FormAlert message={t(fetcher.data.error)} />}
    </li>
  );
}
