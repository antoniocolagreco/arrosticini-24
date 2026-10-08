import { createInstance } from "i18next";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { HydratedRouter } from "react-router/dom";
import { resources } from "./locales/index.js";

const i18n = createInstance();
await i18n.use(initReactI18next).init({
  resources,
  lng: document.documentElement.lang,
  fallbackLng: "it",
  defaultNS: "common",
  interpolation: { escapeValue: false },
});
startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <HydratedRouter />
      </I18nextProvider>
    </StrictMode>,
  );
});
