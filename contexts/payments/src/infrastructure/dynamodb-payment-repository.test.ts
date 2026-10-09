import { randomUUID } from "node:crypto";
import { Money } from "@arrosticini/kernel";
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { Payment } from "../domain/payment.js";
import { DynamoDbPaymentRepository } from "./dynamodb-payment-repository.js";
import { paymentsTableDefinition } from "./payments-table.js";

const tableName = `payments-test-${randomUUID()}`;
const client = new DynamoDBClient({
  endpoint: inject("dynamodbEndpoint"),
  region: "local",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});
const repository = new DynamoDbPaymentRepository(DynamoDBDocumentClient.from(client), tableName);

function plain(target: Payment | undefined) {
  return (
    target && {
      orderId: target.orderId,
      userId: target.userId,
      stripeSessionId: target.stripeSessionId,
      amount: target.amount,
      status: target.status,
      createdAt: target.createdAt,
      updatedAt: target.updatedAt,
    }
  );
}

beforeAll(async () => {
  await client.send(new CreateTableCommand(paymentsTableDefinition(tableName)));
});

afterAll(async () => {
  await client.send(new DeleteTableCommand({ TableName: tableName }));
});

describe("DynamoDbPaymentRepository", () => {
  it("saves a payment and its later status", async () => {
    const payment = Payment.start(
      {
        orderId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
        userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
        stripeSessionId: "cs_test_a1",
        amount: Money.ofCents(6870),
      },
      new Date("2026-10-09T10:00:00.000Z"),
    );

    await repository.save(payment);
    expect(plain(await repository.findByOrderId(payment.orderId))).toEqual(plain(payment));

    payment.succeed(new Date("2026-10-09T10:05:00.000Z"));
    await repository.save(payment);
    expect(plain(await repository.findByOrderId(payment.orderId))).toEqual(plain(payment));
  });

  it("returns undefined for an order without payment", async () => {
    expect(await repository.findByOrderId("01JB2Q7Z8X4M3N5P6R7S8T9V0Z")).toBeUndefined();
  });
});
