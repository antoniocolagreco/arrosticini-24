import type { Id } from "@arrosticini/kernel";
import { type DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { PaymentCustomerRepository } from "../domain/payment-customer-repository.js";

function customerKey(userId: Id) {
  return { PK: `CUSTOMER#${userId}`, SK: "STRIPE" as const };
}

export class DynamoDbPaymentCustomerRepository implements PaymentCustomerRepository {
  readonly #client: DynamoDBDocumentClient;
  readonly #tableName: string;

  constructor(client: DynamoDBDocumentClient, tableName: string) {
    this.#client = client;
    this.#tableName = tableName;
  }

  async findStripeCustomerId(userId: Id): Promise<string | undefined> {
    const { Item } = await this.#client.send(
      new GetCommand({ TableName: this.#tableName, Key: customerKey(userId) }),
    );
    return Item?.stripeCustomerId as string | undefined;
  }

  async save(userId: Id, stripeCustomerId: string): Promise<void> {
    await this.#client.send(
      new PutCommand({
        TableName: this.#tableName,
        Item: { ...customerKey(userId), stripeCustomerId },
      }),
    );
  }
}
