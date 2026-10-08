import { describe, expect, it } from "vitest";
import enCommon from "./en/common.json";
import enErrors from "./en/errors.json";
import itCommon from "./it/common.json";
import itErrors from "./it/errors.json";

describe("translation keys", () => {
  it("matches Italian and English in the common namespace", () => {
    expect(Object.keys(enCommon).sort()).toEqual(Object.keys(itCommon).sort());
  });

  it("matches Italian and English in the errors namespace", () => {
    expect(Object.keys(enErrors).sort()).toEqual(Object.keys(itErrors).sort());
  });
});
