import type { Locale } from "@arrosticini/kernel";

export function Price({ cents, locale }: { cents: number; locale: Locale }) {
  const parts: Intl.NumberFormatPart[] = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    useGrouping: "always",
  }).formatToParts(cents / 100);
  const currency: string = parts.find(({ type }) => type === "currency")?.value ?? "€";
  const amount: string = parts
    .filter(({ type }) => type !== "currency" && type !== "literal")
    .map(({ value }) => value)
    .join("");
  return (
    <span className="price">
      {currency}
      {locale === "it" ? " " : ""}
      {amount}
    </span>
  );
}
