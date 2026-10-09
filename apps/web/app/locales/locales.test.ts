import { describe, expect, it } from "vitest";
import enAccount from "./en/account.json";
import enAdmin from "./en/admin.json";
import enCommon from "./en/common.json";
import enErrors from "./en/errors.json";
import enShop from "./en/shop.json";
import enStress from "./en/stress.json";
import itAccount from "./it/account.json";
import itAdmin from "./it/admin.json";
import itCommon from "./it/common.json";
import itErrors from "./it/errors.json";
import itShop from "./it/shop.json";
import itStress from "./it/stress.json";

describe("translation keys", () => {
  it("matches Italian and English in the stress namespace", () => {
    expect(Object.keys(enStress).sort()).toEqual(Object.keys(itStress).sort());
  });
  it("matches Italian and English in the admin namespace", () => {
    expect(Object.keys(enAdmin).sort()).toEqual(Object.keys(itAdmin).sort());
  });
  it("matches Italian and English in the account namespace", () => {
    expect(Object.keys(enAccount).sort()).toEqual(Object.keys(itAccount).sort());
  });
  it("matches Italian and English in the shop namespace", () => {
    expect(Object.keys(enShop).sort()).toEqual(Object.keys(itShop).sort());
  });
  it("matches Italian and English in the common namespace", () => {
    expect(Object.keys(enCommon).sort()).toEqual(Object.keys(itCommon).sort());
  });

  it("matches Italian and English in the errors namespace", () => {
    expect(Object.keys(enErrors).sort()).toEqual(Object.keys(itErrors).sort());
  });
});
