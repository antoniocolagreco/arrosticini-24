import { type Id, type LocalizedText, Money } from "@arrosticini/kernel";
import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  paginateQuery,
} from "@aws-sdk/lib-dynamodb";
import { Order, type OrderStatus, type ShippingAddress } from "../domain/order.js";
import type { OrderRepository } from "../domain/order-repository.js";

interface OrderLineItem {
  slug: string;
  name: LocalizedText;
  unitPriceCents: number;
  quantity: number;
}

interface OrderItem {
  PK: string;
  SK: "META";
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: "ORDER";
  GSI2SK: string;
  id: Id;
  userId: Id;
  lines: OrderLineItem[];
  shippingAddress: ShippingAddress;
  totalCents: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
}

function orderKey(id: Id) {
  return { PK: `ORDER#${id}`, SK: "META" as const };
}

function toItem(order: Order): OrderItem {
  const createdAt = order.createdAt.toISOString();
  return {
    ...orderKey(order.id),
    GSI1PK: `USER#${order.userId}`,
    GSI1SK: createdAt,
    GSI2PK: "ORDER",
    GSI2SK: createdAt,
    id: order.id,
    userId: order.userId,
    lines: order.lines.map(({ slug, name, unitPrice, quantity }) => ({
      slug,
      name,
      unitPriceCents: unitPrice.amountCents,
      quantity,
    })),
    shippingAddress: order.shippingAddress,
    totalCents: order.total.amountCents,
    currency: order.total.currency,
    status: order.status,
    createdAt,
    ...(order.paidAt === undefined ? {} : { paidAt: order.paidAt.toISOString() }),
  };
}

function toOrder(item: OrderItem): Order {
  return Order.restore({
    id: item.id,
    userId: item.userId,
    lines: item.lines.map(({ slug, name, unitPriceCents, quantity }) => ({
      slug,
      name,
      unitPrice: Money.ofCents(unitPriceCents),
      quantity,
    })),
    shippingAddress: item.shippingAddress,
    status: item.status,
    createdAt: new Date(item.createdAt),
    ...(item.paidAt === undefined ? {} : { paidAt: new Date(item.paidAt) }),
  });
}

export class DynamoDbOrderRepository implements OrderRepository {
  readonly #client: DynamoDBDocumentClient;
  readonly #tableName: string;

  constructor(client: DynamoDBDocumentClient, tableName: string) {
    this.#client = client;
    this.#tableName = tableName;
  }

  async findById(id: Id): Promise<Order | undefined> {
    const { Item } = await this.#client.send(
      new GetCommand({ TableName: this.#tableName, Key: orderKey(id) }),
    );
    return Item === undefined ? undefined : toOrder(Item as OrderItem);
  }

  listByUser(userId: Id): Promise<Order[]> {
    return this.#newestFirst("GSI1", "GSI1PK", `USER#${userId}`);
  }

  listAll(): Promise<Order[]> {
    return this.#newestFirst("GSI2", "GSI2PK", "ORDER");
  }

  async create(order: Order): Promise<void> {
    await this.#client.send(
      new PutCommand({
        TableName: this.#tableName,
        Item: toItem(order),
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  }

  async save(order: Order): Promise<void> {
    await this.#client.send(
      new PutCommand({
        TableName: this.#tableName,
        Item: toItem(order),
        ConditionExpression: "attribute_exists(PK)",
      }),
    );
  }

  async #newestFirst(indexName: string, keyName: string, keyValue: string): Promise<Order[]> {
    const orders: Order[] = [];
    const pages = paginateQuery(
      { client: this.#client },
      {
        TableName: this.#tableName,
        IndexName: indexName,
        KeyConditionExpression: `${keyName} = :key`,
        ExpressionAttributeValues: { ":key": keyValue },
        ScanIndexForward: false,
      },
    );
    for await (const { Items = [] } of pages) {
      orders.push(...Items.map((item) => toOrder(item as OrderItem)));
    }
    return orders;
  }
}
