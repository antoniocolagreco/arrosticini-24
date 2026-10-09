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
  const [added, setAdded] = useState<boolean>(false);
  const busy: boolean =
    fetcher.state !== "idle" || fetchers.some((pending) => pending.formAction?.endsWith("/cart"));
  const label = fetcher.state !== "idle" ? "adding" : added ? "added" : "add";
  useEffect(() => {
    if (!fetcher.data?.ok) return;
    setQuantity(1);
    setAdded(true);
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => setAdded(false), 1200);
    return () => clearTimeout(timer);
  }, [fetcher.data]);
  return (
    <div className="add-to-cart">
      <fetcher.Form method="post" action={`/${i18n.language}/cart`} aria-busy={busy}>
        <input type="hidden" name="intent" value="add" />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="quantity" value={quantity} />
        <QuantityStepper value={quantity} onChange={setQuantity} busy={busy} />
        <Button type="submit" disabled={busy} className={added ? "is-added" : undefined}>
          {added ? <Check aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}
          <span className="add-to-cart-label">
            {(["add", "adding", "added"] as const).map((state) => (
              <span key={state} aria-hidden={state !== label}>
                {t(state)}
              </span>
            ))}
          </span>
        </Button>
      </fetcher.Form>
      <span className="sr-only" role="status">
        {added ? t("added") : ""}
      </span>
      {fetcher.data?.error && <FormAlert message={t(fetcher.data.error)} />}
    </div>
  );
}
