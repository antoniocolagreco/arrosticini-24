import type { Resource } from "i18next";
import enAccount from "./en/account.json";
import enAdmin from "./en/admin.json";
import enCommon from "./en/common.json";
import enErrors from "./en/errors.json";
import enShop from "./en/shop.json";
import itAccount from "./it/account.json";
import itAdmin from "./it/admin.json";
import itCommon from "./it/common.json";
import itErrors from "./it/errors.json";
import itShop from "./it/shop.json";

export const resources: Resource = {
  it: { common: itCommon, errors: itErrors, shop: itShop, account: itAccount, admin: itAdmin },
  en: { common: enCommon, errors: enErrors, shop: enShop, account: enAccount, admin: enAdmin },
};
