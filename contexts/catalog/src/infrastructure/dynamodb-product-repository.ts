import { DomainError, type LocalizedText, Money } from "@arrosticini/kernel";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  paginateScan,
  type ScanCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { Product, type ProductImage, type ProductStatus } from "../domain/product.js";
import type { ProductRepository, ProductSearch } from "../domain/product-repository.js";

interface ProductItem {
  PK: string;
  SK: "META";
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  pieces?: number;
  priceCents: number;
  currency: string;
  images: ProductImage[];
  status: ProductStatus;
  searchText: string;
  updatedAt: string;
}

function productKey(slug: string) {
  return { PK: `PRODUCT#${slug}`, SK: "META" as const };
}

function toItem(product: Product): ProductItem {
  return {
    ...productKey(product.slug),
    slug: product.slug,
    name: product.name,
    description: product.description,
    ...(product.pieces === undefined ? {} : { pieces: product.pieces }),
    priceCents: product.price.amountCents,
    currency: product.price.currency,
    images: [...product.images],
    status: product.status,
    searchText: product.searchText,
    updatedAt: product.updatedAt.toISOString(),
  };
}

function toProduct(item: ProductItem): Product {
  return Product.restore({
    slug: item.slug,
    name: item.name,
    description: item.description,
    ...(item.pieces === undefined ? {} : { pieces: item.pieces }),
    price: Money.ofCents(item.priceCents),
    images: item.images,
    status: item.status,
    updatedAt: new Date(item.updatedAt),
  });
}

export class DynamoDbProductRepository implements ProductRepository {
  readonly #client: DynamoDBDocumentClient;
  readonly #tableName: string;

  constructor(client: DynamoDBDocumentClient, tableName: string) {
    this.#client = client;
    this.#tableName = tableName;
  }

  async findBySlug(slug: string): Promise<Product | undefined> {
    const { Item } = await this.#client.send(
      new GetCommand({ TableName: this.#tableName, Key: productKey(slug) }),
    );
    return Item === undefined ? undefined : toProduct(Item as ProductItem);
  }

  async search({ text, status }: ProductSearch): Promise<Product[]> {
    const filters = ["begins_with(PK, :prefix)"];
    const input: ScanCommandInput = {
      TableName: this.#tableName,
      ExpressionAttributeValues: { ":prefix": "PRODUCT#" },
    };
    if (status !== undefined) {
      filters.push("#status = :status");
      input.ExpressionAttributeNames = { "#status": "status" };
      input.ExpressionAttributeValues = { ...input.ExpressionAttributeValues, ":status": status };
    }
    if (text !== undefined) {
      filters.push("contains(searchText, :text)");
      input.ExpressionAttributeValues = { ...input.ExpressionAttributeValues, ":text": text };
    }
    input.FilterExpression = filters.join(" AND ");

    const products: Product[] = [];
    for await (const page of paginateScan({ client: this.#client }, input)) {
      for (const item of page.Items ?? []) {
        products.push(toProduct(item as ProductItem));
      }
    }
    return products;
  }

  async create(product: Product): Promise<void> {
    try {
      await this.#client.send(
        new PutCommand({
          TableName: this.#tableName,
          Item: toItem(product),
          ConditionExpression: "attribute_not_exists(PK)",
        }),
      );
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new DomainError("PRODUCT_SLUG_TAKEN", `Slug already taken: ${product.slug}`);
      }
      throw error;
    }
  }

  async save(product: Product): Promise<void> {
    await this.#client.send(
      new PutCommand({
        TableName: this.#tableName,
        Item: toItem(product),
        ConditionExpression: "attribute_exists(PK)",
      }),
    );
  }
}
