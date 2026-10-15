import { type Id, Money } from "@arrosticini/kernel";
import { type DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Payment, type PaymentStatus } from "../domain/payment.js";
import type { PaymentRepository } from "../domain/payment-repository.js";

interface PaymentItem {
  PK: string;
  SK: "META";
  orderId: Id;
  userId: Id;
  stripeSessionId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

function paymentKey(orderId: Id) {
  return { PK: `PAYMENT#${orderId}`, SK: "META" as const };
}

export class DynamoDbPaymentRepository implements PaymentRepository {
  readonly #client: DynamoDBDocumentClient;
  readonly #tableName: string;

  constructor(client: DynamoDBDocumentClient, tableName: string) {
    this.#client = client;
    this.#tableName = tableName;
  }

  async findByOrderId(orderId: Id): Promise<Payment | undefined> {
    const { Item } = await this.#client.send(
      new GetCommand({ TableName: this.#tableName, Key: paymentKey(orderId) }),
    );
    if (Item === undefined) {
      return undefined;
    }
    const item = Item as PaymentItem;
    return Payment.restore({
      orderId: item.orderId,
      userId: item.userId,
      stripeSessionId: item.stripeSessionId,
      amount: Money.ofCents(item.amountCents),
      status: item.status,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    });
  }

  async save(payment: Payment): Promise<void> {
    const item: PaymentItem = {
      ...paymentKey(payment.orderId),
      orderId: payment.orderId,
      userId: payment.userId,
      stripeSessionId: payment.stripeSessionId,
      amountCents: payment.amount.amountCents,
      currency: payment.amount.currency,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
    await this.#client.send(new PutCommand({ TableName: this.#tableName, Item: item }));
  }
}
