import { describe, expect, it } from "vitest";
import { DomainError } from "./domain-error.js";
import { localizedText } from "./localized-text.js";

describe("localizedText", () => {
  it("trims both texts", () => {
    expect(localizedText({ it: " Vino locale ", en: " Local wine " })).toEqual({
      it: "Vino locale",
      en: "Local wine",
    });
  });

  it.each([
    { it: "", en: "Local wine" },
    { it: "Vino locale", en: "   " },
  ])("rejects a missing translation in %o", (values) => {
    expect(() => localizedText(values)).toThrow(DomainError);
  });
});
