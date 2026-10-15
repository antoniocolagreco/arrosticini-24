import { randomUUID } from "node:crypto";
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { DynamoDbPaymentCustomerRepository } from "./dynamodb-payment-customer-repository.js";
import { paymentsTableDefinition } from "./payments-table.js";

const tableName = `payments-test-${randomUUID()}`;
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
  await client.send(new CreateTableCommand(paymentsTableDefinition(tableName)));
});

afterAll(async () => {
  await client.send(new DeleteTableCommand({ TableName: tableName }));
});

describe("DynamoDbPaymentCustomerRepository", () => {
  it("stores the Stripe customer of a user", async () => {
    await repository.save("01JB2Q7Z8X4M3N5P6R7S8T9V0X", "cus_mario");

    expect(await repository.findStripeCustomerId("01JB2Q7Z8X4M3N5P6R7S8T9V0X")).toBe("cus_mario");
    expect(await repository.findStripeCustomerId("01JB2Q7Z8X4M3N5P6R7S8T9V0Y")).toBeUndefined();
  });
});
