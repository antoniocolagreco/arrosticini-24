export const LOCALES = ["it", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value);
}
