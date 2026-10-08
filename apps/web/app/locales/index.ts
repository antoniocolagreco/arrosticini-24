import type { Resource } from "i18next";
import enCommon from "./en/common.json";
import enErrors from "./en/errors.json";
import itCommon from "./it/common.json";
import itErrors from "./it/errors.json";

export const resources: Resource = {
  it: { common: itCommon, errors: itErrors },
  en: { common: enCommon, errors: enErrors },
};
