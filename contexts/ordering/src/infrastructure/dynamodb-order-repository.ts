import {
  decodeCursor,
  encodeCursor,
  type Id,
  type LocalizedText,
  Money,
  type Page,
  type PageRequest,
} from "@arrosticini/kernel";
import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Order, type OrderStatus, type Shipment, type ShippingAddress } from "../domain/order.js";
import type { OrderRepository } from "../domain/order-repository.js";

interface OrderLineItem {
  slug: string;
  name: LocalizedText;
  unitPriceCents: number;
  quantity: number;
}

interface OrderItem {
  orderId: Id;
  kind: "order";
  userId: Id;
  lines: OrderLineItem[];
  shippingAddress: ShippingAddress;
  totalCents: number;
  currency: string;
  status: OrderStatus;
  shipment?: Shipment;
  createdAt: string;
  paidAt?: string;
}

function toItem(order: Order): OrderItem {
  return {
    orderId: order.id,
    kind: "order",
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
    ...(order.shipment === undefined ? {} : { shipment: order.shipment }),
    createdAt: order.createdAt.toISOString(),
    ...(order.paidAt === undefined ? {} : { paidAt: order.paidAt.toISOString() }),
  };
}

function toOrder(item: OrderItem): Order {
  return Order.restore({
    id: item.orderId,
    userId: item.userId,
    lines: item.lines.map(({ slug, name, unitPriceCents, quantity }) => ({
      slug,
      name,
      unitPrice: Money.ofCents(unitPriceCents),
      quantity,
    })),
    shippingAddress: item.shippingAddress,
    status: item.status,
    ...(item.shipment === undefined ? {} : { shipment: item.shipment }),
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
      new GetCommand({ TableName: this.#tableName, Key: { orderId: id } }),
    );
    return Item === undefined ? undefined : toOrder(Item as OrderItem);
  }

  listByUser(userId: Id, page: PageRequest): Promise<Page<Order>> {
    return this.#newestFirst("byUser", "userId", userId, page);
  }

  listByStatus(status: OrderStatus, page: PageRequest): Promise<Page<Order>> {
    return this.#newestFirst("byStatus", "status", status, page);
  }

  listAll(page: PageRequest): Promise<Page<Order>> {
    return this.#newestFirst("byCreatedAt", "kind", "order", page);
  }

  async create(order: Order): Promise<void> {
    await this.#client.send(
      new PutCommand({
        TableName: this.#tableName,
        Item: toItem(order),
        ConditionExpression: "attribute_not_exists(orderId)",
      }),
    );
  }

  async save(order: Order): Promise<void> {
    await this.#client.send(
      new PutCommand({
        TableName: this.#tableName,
        Item: toItem(order),
        ConditionExpression: "attribute_exists(orderId)",
      }),
    );
  }

  async #newestFirst(
    indexName: string,
    keyName: string,
    keyValue: string,
    { cursor, limit }: PageRequest,
  ): Promise<Page<Order>> {
    const { Items = [], LastEvaluatedKey } = await this.#client.send(
      new QueryCommand({
        TableName: this.#tableName,
        IndexName: indexName,
        KeyConditionExpression: "#key = :value",
        ExpressionAttributeNames: { "#key": keyName },
        ExpressionAttributeValues: { ":value": keyValue },
        ScanIndexForward: false,
        Limit: limit,
        ...(cursor === undefined
          ? {}
          : { ExclusiveStartKey: decodeCursor(cursor, ["orderId", keyName, "createdAt"]) }),
      }),
    );
    return {
      items: Items.map((item) => toOrder(item as OrderItem)),
      ...(LastEvaluatedKey === undefined ? {} : { nextCursor: encodeCursor(LastEvaluatedKey) }),
    };
  }
}
