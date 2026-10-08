import { DomainError, localizedText, Money } from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { Product, type ProductStatus } from "../domain/product.js";
import type { ProductRepository, ProductSearch } from "../domain/product-repository.js";
import type { Actor } from "./actor.js";
import { GetProduct } from "./get-product.js";
import { ListProducts } from "./list-products.js";

class InMemoryProductRepository implements ProductRepository {
  readonly products: Product[];
  lastSearch: ProductSearch | undefined;

  constructor(products: Product[]) {
    this.products = products;
  }

  async findBySlug(slug: string) {
    return this.products.find((product) => product.slug === slug);
  }

  async search(criteria: ProductSearch) {
    this.lastSearch = criteria;
    return this.products.filter(
      (product) =>
        (criteria.status === undefined || product.status === criteria.status) &&
        (criteria.text === undefined || product.searchText.includes(criteria.text)),
    );
  }

  async create(product: Product) {
    this.products.push(product);
  }
}

function product(slug: string, priceCents: number, status: ProductStatus): Product {
  return Product.create(
    {
      slug,
      name: localizedText({ it: slug, en: slug }),
      description: localizedText({ it: `Descrizione ${slug}`, en: `Description ${slug}` }),
      price: Money.ofCents(priceCents),
      images: [],
      status,
    },
    new Date("2026-10-08T10:00:00.000Z"),
  );
}

const admin: Actor = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0W", role: "admin" };
const customer: Actor = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X", role: "customer" };

function repository() {
  return new InMemoryProductRepository([
    product("fornacella", 10000, "ACTIVE"),
    product("vino", 500, "ACTIVE"),
    product("carbone", 2000, "DRAFT"),
    product("cuoco", 5000, "ARCHIVED"),
  ]);
}

describe("ListProducts", () => {
  it("shows only active products to anonymous users, cheapest first", async () => {
    const products = await new ListProducts(repository()).execute(undefined, {});

    expect(products.map(({ slug }) => slug)).toEqual(["vino", "fornacella"]);
  });

  it("shows every product to admins", async () => {
    const products = await new ListProducts(repository()).execute(admin, {});

    expect(products.map(({ slug }) => slug)).toEqual(["vino", "carbone", "cuoco", "fornacella"]);
  });

  it("filters by status for admins", async () => {
    const products = await new ListProducts(repository()).execute(admin, { status: "DRAFT" });

    expect(products.map(({ slug }) => slug)).toEqual(["carbone"]);
  });

  it("forbids the status filter to customers", async () => {
    await expect(
      new ListProducts(repository()).execute(customer, { status: "DRAFT" }),
    ).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
  });

  it("searches with a normalized query", async () => {
    const products = repository();

    await new ListProducts(products).execute(undefined, { q: " VINÒ " });

    expect(products.lastSearch).toEqual({ text: "vino", status: "ACTIVE" });
  });

  it("ignores an empty query", async () => {
    const products = repository();

    await new ListProducts(products).execute(undefined, { q: "  " });

    expect(products.lastSearch).toEqual({ status: "ACTIVE" });
  });
});

describe("GetProduct", () => {
  it("returns an active product", async () => {
    const found = await new GetProduct(repository()).execute(undefined, "vino");

    expect(found.slug).toBe("vino");
  });

  it.each([undefined, customer])("hides a draft product from %o", async (actor) => {
    await expect(new GetProduct(repository()).execute(actor, "carbone")).rejects.toThrow(
      DomainError,
    );
  });

  it("returns a draft product to admins", async () => {
    const found = await new GetProduct(repository()).execute(admin, "carbone");

    expect(found.slug).toBe("carbone");
  });

  it("fails on an unknown slug", async () => {
    await expect(new GetProduct(repository()).execute(admin, "pecora")).rejects.toThrow(
      expect.objectContaining({ code: "PRODUCT_NOT_FOUND" }),
    );
  });
});
