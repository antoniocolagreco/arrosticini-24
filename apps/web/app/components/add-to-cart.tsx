import { Check, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFetcher, useFetchers } from "react-router";
import type { CartResult } from "../lib/cart.server.js";
import { FormAlert } from "./form-alert.js";
import { QuantityStepper } from "./quantity-stepper.js";
import { Button } from "./ui/button.js";

export function AddToCart({ slug }: { slug: string }) {
  const { t, i18n } = useTranslation("shop");
  const fetcher = useFetcher<CartResult>();
  const fetchers = useFetchers();
  const [quantity, setQuantity] = useState<number>(1);
  const [status, setStatus] = useState<"add" | "adding" | "added">("add");
  const [minimumPending, setMinimumPending] = useState<boolean>(false);
  const pending: boolean = fetcher.state !== "idle" || status === "adding";
  const busy: boolean =
    pending || fetchers.some((pending) => pending.formAction?.endsWith("/cart"));
  useEffect(() => {
    if (!minimumPending) return;
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => setMinimumPending(false), 300);
    return () => clearTimeout(timer);
  }, [minimumPending]);
  useEffect(() => {
    if (status === "adding" && fetcher.state === "idle" && !minimumPending) {
      if (fetcher.data?.ok) setQuantity(1);
      setStatus(fetcher.data?.ok ? "added" : "add");
    }
    if (status === "added") {
      const timer: ReturnType<typeof setTimeout> = setTimeout(() => setStatus("add"), 1200);
      return () => clearTimeout(timer);
    }
  }, [fetcher.data, fetcher.state, minimumPending, status]);
  return (
    <div className="add-to-cart">
      <fetcher.Form
        method="post"
        action={`/${i18n.language}/cart`}
        aria-busy={busy}
        onSubmit={() => {
          setStatus("adding");
          setMinimumPending(true);
        }}
      >
        <input type="hidden" name="intent" value="add" />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="quantity" value={quantity} />
        <QuantityStepper value={quantity} onChange={setQuantity} busy={busy} />
        <Button
          type="submit"
          disabled={busy}
          className={status === "added" ? "is-added" : undefined}
        >
          {status === "added" ? <Check aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}
          <span className="add-to-cart-label">
            {(["add", "adding", "added"] as const).map((state) => (
              <span key={state} aria-hidden={state !== status}>
                {t(state)}
              </span>
            ))}
          </span>
        </Button>
      </fetcher.Form>
      <span className="sr-only" role="status">
        {status === "added" ? t("added") : ""}
      </span>
      {fetcher.data?.error && <FormAlert message={t(fetcher.data.error)} />}
    </div>
  );
}
