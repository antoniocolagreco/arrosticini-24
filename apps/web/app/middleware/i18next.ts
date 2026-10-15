import { LOCALES } from "@arrosticini/kernel";
import { initReactI18next } from "react-i18next";
import { createI18nextMiddleware } from "remix-i18next";
import { pathLocale } from "../lib/locale.server.js";
import { resources } from "../locales/index.js";

export const [i18nextMiddleware, getLocale, getInstance] = createI18nextMiddleware({
  detection: {
    supportedLanguages: [...LOCALES],
    fallbackLanguage: "it",
    findLocale: async ({ request }) => pathLocale(request.url),
  },
  i18next: { resources, defaultNS: "common", interpolation: { escapeValue: false } },
  plugins: [initReactI18next],
});
