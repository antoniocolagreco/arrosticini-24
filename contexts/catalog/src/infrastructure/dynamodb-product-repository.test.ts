import { randomUUID } from "node:crypto";
import { DomainError, localizedText, Money } from "@arrosticini/kernel";
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { Product, type ProductStatus } from "../domain/product.js";
import { DynamoDbProductRepository } from "./dynamodb-product-repository.js";
import { productsTableDefinition } from "./products-table.js";

const tableName = `products-test-${randomUUID()}`;
const client = new DynamoDBClient({
  endpoint: inject("dynamodbEndpoint"),
  region: "local",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});
const repository = new DynamoDbProductRepository(DynamoDBDocumentClient.from(client), tableName);

function product(
  slug: string,
  status: ProductStatus,
  priceCents: number,
  pieces?: number,
): Product {
  return Product.create(
    {
      slug,
      name: localizedText({ it: `Prodotto ${slug}`, en: `Product ${slug}` }),
      description: localizedText({ it: "Fatto in Abruzzo", en: "Made in Abruzzo" }),
      ...(pieces === undefined ? {} : { pieces }),
      price: Money.ofCents(priceCents),
      images: [
        {
          id: "0192e1a0-0000-7000-8000-000000000012",
          key: `products/${slug}/0192e1a0-0000-7000-8000-000000000012.webp`,
        },
      ],
      status,
    },
    new Date("2026-10-08T10:00:00.000Z"),
  );
}

function plain(target: Product | undefined) {
  return (
    target && {
      slug: target.slug,
      name: target.name,
      description: target.description,
      pieces: target.pieces,
      price: target.price,
      images: target.images,
      status: target.status,
      updatedAt: target.updatedAt,
    }
  );
}

const firstPage = { limit: 20 };

const slugs = (products: Product[]) => products.map(({ slug }) => slug);

beforeAll(async () => {
  await client.send(new CreateTableCommand(productsTableDefinition(tableName)));
  await repository.create(product("arrosticini-75", "ACTIVE", 3750, 75));
  await repository.create(product("vino", "ACTIVE", 500));
  await repository.create(product("carbone", "DRAFT", 2000));
  await repository.create(product("fornacella", "ACTIVE", 10000));
});

afterAll(async () => {
  await client.send(new DeleteTableCommand({ TableName: tableName }));
});

describe("DynamoDbProductRepository", () => {
  it("finds a product by slug with every field", async () => {
    const found = await repository.findBySlug("arrosticini-75");

    expect(plain(found)).toEqual(plain(product("arrosticini-75", "ACTIVE", 3750, 75)));
  });

  it("returns undefined for an unknown slug", async () => {
    expect(await repository.findBySlug("pecora-diy")).toBeUndefined();
  });

  it("rejects a duplicate slug", async () => {
    await expect(repository.create(product("vino", "ACTIVE", 500))).rejects.toThrow(
      new DomainError("PRODUCT_SLUG_TAKEN", "Slug already taken: vino"),
    );
  });

  it("searches by status, cheapest first", async () => {
    const { items } = await repository.search({ status: "ACTIVE" }, firstPage);

    expect(slugs(items)).toEqual(["vino", "arrosticini-75", "fornacella"]);
  });

  it("searches by text", async () => {
    const { items } = await repository.search({ text: "prodotto vino" }, firstPage);

    expect(slugs(items)).toEqual(["vino"]);
  });

  it("returns every product without criteria, cheapest first", async () => {
    const { items, nextCursor } = await repository.search({}, firstPage);

    expect(slugs(items)).toEqual(["vino", "carbone", "arrosticini-75", "fornacella"]);
    expect(nextCursor).toBeUndefined();
  });

  it("continues from the cursor of the previous page", async () => {
    const first = await repository.search({}, { limit: 3 });
    const second = await repository.search({}, { cursor: first.nextCursor, limit: 3 });

    expect(slugs(first.items)).toEqual(["vino", "carbone", "arrosticini-75"]);
    expect(slugs(second.items)).toEqual(["fornacella"]);
    expect(second.nextCursor).toBeUndefined();
  });

  it("fills the page when the text filter skips products", async () => {
    const { items, nextCursor } = await repository.search(
      { status: "ACTIVE", text: "prodotto fornacella" },
      { limit: 1 },
    );

    expect(slugs(items)).toEqual(["fornacella"]);
    expect(nextCursor).toBeDefined();
  });

  it("rejects a cursor of another index", async () => {
    const { nextCursor } = await repository.search({}, { limit: 1 });

    await expect(
      repository.search({ status: "ACTIVE" }, { cursor: nextCursor, limit: 1 }),
    ).rejects.toThrow(new DomainError("INVALID_CURSOR", "Invalid cursor"));
  });

  it("saves the changes of an existing product", async () => {
    const changed = product("vino", "ACTIVE", 500);
    changed.update(
      { pieces: 6, price: Money.ofCents(4200), status: "ARCHIVED" },
      new Date("2026-10-09T10:00:00.000Z"),
    );
    changed.removeImage(
      "0192e1a0-0000-7000-8000-000000000012",
      new Date("2026-10-09T10:00:00.000Z"),
    );

    await repository.save(changed);

    expect(plain(await repository.findBySlug("vino"))).toEqual(plain(changed));
  });

  it("refuses to save a product that was never created", async () => {
    await expect(repository.save(product("birra", "DRAFT", 400))).rejects.toThrow();
    expect(await repository.findBySlug("birra")).toBeUndefined();
  });
});
