import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Price } from "./price.js";

describe("design system prices", () => {
  it("places the currency first with Italian separators", () => {
    expect(renderToStaticMarkup(createElement(Price, { cents: 180000, locale: "it" }))).toContain(
      "€ 1.800,00",
    );
  });

  it("places the currency first with English separators", () => {
    expect(renderToStaticMarkup(createElement(Price, { cents: 180000, locale: "en" }))).toContain(
      "€1,800.00",
    );
  });

  it("preserves two decimals for a whole amount", () => {
    expect(renderToStaticMarkup(createElement(Price, { cents: 5000, locale: "it" }))).toContain(
      "€ 50,00",
    );
  });
});
