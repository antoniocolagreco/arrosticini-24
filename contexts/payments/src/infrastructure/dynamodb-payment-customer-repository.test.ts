import { randomUUID } from "node:crypto";
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { DynamoDbPaymentCustomerRepository } from "./dynamodb-payment-customer-repository.js";
import { paymentCustomersTableDefinition } from "./payment-customers-table.js";

const tableName = `payment-customers-test-${randomUUID()}`;
const client = new DynamoDBClient({
  endpoint: inject("dynamodbEndpoint"),
  region: "local",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});
const repository = new DynamoDbPaymentCustomerRepository(
  DynamoDBDocumentClient.from(client),
  tableName,
);

beforeAll(async () => {
  await client.send(new CreateTableCommand(paymentCustomersTableDefinition(tableName)));
});

afterAll(async () => {
  await client.send(new DeleteTableCommand({ TableName: tableName }));
});

describe("DynamoDbPaymentCustomerRepository", () => {
  it("stores the Stripe customer of a user", async () => {
    await repository.save("0192e1a0-0000-7000-8000-000000000013", "cus_mario");

    expect(await repository.findStripeCustomerId("0192e1a0-0000-7000-8000-000000000013")).toBe(
      "cus_mario",
    );
    expect(
      await repository.findStripeCustomerId("0192e1a0-0000-7000-8000-000000000014"),
    ).toBeUndefined();
  });
});
