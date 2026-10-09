import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

export function QuantityStepper({
  value,
  onChange,
  busy = false,
}: {
  value: number;
  onChange: (value: number) => void;
  busy?: boolean;
}) {
  const { t } = useTranslation("shop");
  return (
    <div className="quantity-stepper" aria-busy={busy}>
      <button
        type="button"
        aria-label={t("decrease")}
        aria-busy={busy}
        className={value <= 1 ? "is-minimum" : undefined}
        disabled={busy || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <output aria-live="polite" aria-label={t("quantity")}>
        {value}
      </output>
      <button
        type="button"
        aria-label={t("increase")}
        aria-busy={busy}
        disabled={busy}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
