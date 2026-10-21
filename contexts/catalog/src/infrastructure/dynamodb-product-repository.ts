import {
  type CursorKey,
  DomainError,
  decodeCursor,
  encodeCursor,
  type LocalizedText,
  Money,
  type Page,
  type PageRequest,
} from "@arrosticini/kernel";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Product, type ProductImage, type ProductStatus } from "../domain/product.js";
import type { ProductRepository, ProductSearch } from "../domain/product-repository.js";

interface ProductItem {
  slug: string;
  kind: "product";
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

function toItem(product: Product): ProductItem {
  return {
    slug: product.slug,
    kind: "product",
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
      new GetCommand({ TableName: this.#tableName, Key: { slug } }),
    );
    return Item === undefined ? undefined : toProduct(Item as ProductItem);
  }

  async search(
    { text, status }: ProductSearch,
    { cursor, limit }: PageRequest,
  ): Promise<Page<Product>> {
    const index =
      status === undefined
        ? { name: "bySlug", key: "kind", value: "product" }
        : { name: "byStatus", key: "status", value: status };
    const products: Product[] = [];
    let startKey: CursorKey | undefined =
      cursor === undefined ? undefined : decodeCursor(cursor, ["slug", index.key]);
    do {
      const { Items = [], LastEvaluatedKey } = await this.#client.send(
        new QueryCommand({
          TableName: this.#tableName,
          IndexName: index.name,
          KeyConditionExpression: "#key = :value",
          ExpressionAttributeNames: { "#key": index.key },
          ExpressionAttributeValues: {
            ":value": index.value,
            ...(text === undefined ? {} : { ":text": text }),
          },
          ...(text === undefined ? {} : { FilterExpression: "contains(searchText, :text)" }),
          ...(startKey === undefined ? {} : { ExclusiveStartKey: startKey }),
          Limit: limit - products.length,
        }),
      );
      products.push(...Items.map((item) => toProduct(item as ProductItem)));
      startKey = LastEvaluatedKey as CursorKey | undefined;
    } while (startKey !== undefined && products.length < limit);
    return {
      items: products,
      ...(startKey === undefined ? {} : { nextCursor: encodeCursor(startKey) }),
    };
  }

  async create(product: Product): Promise<void> {
    try {
      await this.#client.send(
        new PutCommand({
          TableName: this.#tableName,
          Item: toItem(product),
          ConditionExpression: "attribute_not_exists(slug)",
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
        ConditionExpression: "attribute_exists(slug)",
      }),
    );
  }
}
