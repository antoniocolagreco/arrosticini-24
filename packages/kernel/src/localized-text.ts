import { DomainError } from "./domain-error.js";
import type { Locale } from "./locale.js";

export type LocalizedText = Readonly<Record<Locale, string>>;

export function localizedText(values: Record<Locale, string>): LocalizedText {
  const it = values.it.trim();
  const en = values.en.trim();
  if (it === "" || en === "") {
    throw new DomainError("INVALID_LOCALIZED_TEXT", "Both it and en texts are required");
  }
  return Object.freeze({ it, en });
}
