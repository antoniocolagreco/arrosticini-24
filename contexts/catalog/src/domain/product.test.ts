import { DomainError, localizedText, Money } from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { normalizeSearchText, Product } from "./product.js";

const now = new Date("2026-10-08T10:00:00.000Z");

function props(overrides: Partial<Parameters<typeof Product.create>[0]> = {}) {
  return {
    slug: "vino",
    name: localizedText({ it: "Vino locale", en: "Local wine" }),
    description: localizedText({ it: "Rosso d'Abruzzo", en: "Red wine from Abruzzo" }),
    price: Money.ofCents(500),
    images: [],
    status: "ACTIVE" as const,
    ...overrides,
  };
}

describe("Product.create", () => {
  it("sets updatedAt to now", () => {
    expect(Product.create(props(), now).updatedAt).toEqual(now);
  });

  it.each(["Vino", "vino_rosso", "-vino", "a".repeat(65)])("rejects slug %o", (slug) => {
    expect(() => Product.create(props({ slug }), now)).toThrow(DomainError);
  });

  it.each([0, -1, 1.5])("rejects %o pieces", (pieces) => {
    expect(() => Product.create(props({ pieces }), now)).toThrow(DomainError);
  });
});

describe("Product.searchText", () => {
  it("contains both languages in lowercase without accents", () => {
    const product = Product.create(
      props({
        name: localizedText({ it: "Città", en: "City" }),
        description: localizedText({ it: "Perché sì", en: "Because" }),
      }),
      now,
    );

    expect(product.searchText).toBe("citta city perche si because");
  });
});

describe("normalizeSearchText", () => {
  it("normalizes a query like the search text", () => {
    expect(normalizeSearchText("  ÀRROSTICINI ")).toBe("arrosticini");
  });
});
