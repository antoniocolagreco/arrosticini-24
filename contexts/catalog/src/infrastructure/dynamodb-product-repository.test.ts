import { randomUUID } from "node:crypto";
import { DomainError, localizedText, Money } from "@arrosticini/kernel";
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { Product, type ProductStatus } from "../domain/product.js";
import { catalogTableDefinition } from "./catalog-table.js";
import { DynamoDbProductRepository } from "./dynamodb-product-repository.js";

const tableName = `catalog-test-${randomUUID()}`;
const client = new DynamoDBClient({
  endpoint: inject("dynamodbEndpoint"),
  region: "local",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});
const repository = new DynamoDbProductRepository(DynamoDBDocumentClient.from(client), tableName);

function product(slug: string, status: ProductStatus, pieces?: number): Product {
  return Product.create(
    {
      slug,
      name: localizedText({ it: `Prodotto ${slug}`, en: `Product ${slug}` }),
      description: localizedText({ it: "Fatto in Abruzzo", en: "Made in Abruzzo" }),
      ...(pieces === undefined ? {} : { pieces }),
      price: Money.ofCents(3750),
      images: [
        {
          id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
          key: `products/${slug}/01JB2Q7Z8X4M3N5P6R7S8T9V0W.webp`,
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

beforeAll(async () => {
  await client.send(new CreateTableCommand(catalogTableDefinition(tableName)));
  await repository.create(product("arrosticini-75", "ACTIVE", 75));
  await repository.create(product("vino", "ACTIVE"));
  await repository.create(product("carbone", "DRAFT"));
});

afterAll(async () => {
  await client.send(new DeleteTableCommand({ TableName: tableName }));
});

describe("DynamoDbProductRepository", () => {
  it("finds a product by slug with every field", async () => {
    const found = await repository.findBySlug("arrosticini-75");

    expect(plain(found)).toEqual(plain(product("arrosticini-75", "ACTIVE", 75)));
  });

  it("returns undefined for an unknown slug", async () => {
    expect(await repository.findBySlug("pecora-diy")).toBeUndefined();
  });

  it("rejects a duplicate slug", async () => {
    await expect(repository.create(product("vino", "ACTIVE"))).rejects.toThrow(
      new DomainError("PRODUCT_SLUG_TAKEN", "Slug already taken: vino"),
    );
  });

  it("searches by status", async () => {
    const found = await repository.search({ status: "ACTIVE" });

    expect(found.map(({ slug }) => slug).sort()).toEqual(["arrosticini-75", "vino"]);
  });

  it("searches by text", async () => {
    const found = await repository.search({ text: "prodotto vino" });

    expect(found.map(({ slug }) => slug)).toEqual(["vino"]);
  });

  it("returns every product without criteria", async () => {
    const found = await repository.search({});

    expect(found).toHaveLength(3);
  });

  it("saves the changes of an existing product", async () => {
    const changed = product("vino", "ACTIVE");
    changed.update(
      { pieces: 6, price: Money.ofCents(4200), status: "ARCHIVED" },
      new Date("2026-10-09T10:00:00.000Z"),
    );
    changed.removeImage("01JB2Q7Z8X4M3N5P6R7S8T9V0W", new Date("2026-10-09T10:00:00.000Z"));

    await repository.save(changed);

    expect(plain(await repository.findBySlug("vino"))).toEqual(plain(changed));
  });

  it("refuses to save a product that was never created", async () => {
    await expect(repository.save(product("birra", "DRAFT"))).rejects.toThrow();
    expect(await repository.findBySlug("birra")).toBeUndefined();
  });
});
