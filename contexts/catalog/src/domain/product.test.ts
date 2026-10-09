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

describe("Product.update", () => {
  const later = new Date("2026-10-09T10:00:00.000Z");

  it("changes only the given fields", () => {
    const product = Product.create(props({ pieces: 50 }), now);

    product.update(
      {
        name: localizedText({ it: "Vino rosso", en: "Red wine" }),
        price: Money.ofCents(650),
        status: "ARCHIVED",
      },
      later,
    );

    expect(product.name).toEqual({ it: "Vino rosso", en: "Red wine" });
    expect(product.description).toEqual({ it: "Rosso d'Abruzzo", en: "Red wine from Abruzzo" });
    expect(product.price).toEqual(Money.ofCents(650));
    expect(product.status).toBe("ARCHIVED");
    expect(product.pieces).toBe(50);
    expect(product.updatedAt).toEqual(later);
    expect(product.searchText).toBe("vino rosso red wine rosso d'abruzzo red wine from abruzzo");
  });

  it("sets and clears the pieces", () => {
    const product = Product.create(props(), now);

    product.update({ pieces: 30 }, later);
    expect(product.pieces).toBe(30);

    product.update({ pieces: null }, later);
    expect(product.pieces).toBeUndefined();
  });

  it.each([0, -1, 1.5])("rejects %o pieces", (pieces) => {
    const product = Product.create(props({ pieces: 50 }), now);

    expect(() => product.update({ pieces }, later)).toThrow(DomainError);
    expect(product.pieces).toBe(50);
  });
});

describe("Product images", () => {
  const later = new Date("2026-10-09T10:00:00.000Z");

  it("adds and removes images", () => {
    const product = Product.create(props(), now);
    const first = {
      id: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      key: "products/vino/01JB2Q7Z8X4M3N5P6R7S8T9V0A.webp",
    };
    const second = {
      id: "01JB2Q7Z8X4M3N5P6R7S8T9V0B",
      key: "products/vino/01JB2Q7Z8X4M3N5P6R7S8T9V0B.png",
    };

    product.addImage(first, now);
    product.addImage(second, now);
    const removed = product.removeImage("01JB2Q7Z8X4M3N5P6R7S8T9V0A", later);

    expect(removed).toEqual(first);
    expect(product.images).toEqual([second]);
    expect(product.updatedAt).toEqual(later);
  });

  it("fails to remove an unknown image", () => {
    const product = Product.create(props(), now);

    expect(() => product.removeImage("01JB2Q7Z8X4M3N5P6R7S8T9V0C", later)).toThrow(
      new DomainError("PRODUCT_IMAGE_NOT_FOUND", "Image not found: 01JB2Q7Z8X4M3N5P6R7S8T9V0C"),
    );
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
