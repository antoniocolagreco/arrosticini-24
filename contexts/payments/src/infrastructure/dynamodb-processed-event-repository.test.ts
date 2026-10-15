import { randomUUID } from "node:crypto";
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { DynamoDbProcessedEventRepository } from "./dynamodb-processed-event-repository.js";
import { paymentsTableDefinition } from "./payments-table.js";

const tableName = `payments-test-${randomUUID()}`;
const client = new DynamoDBClient({
  endpoint: inject("dynamodbEndpoint"),
  region: "local",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});
const documents = DynamoDBDocumentClient.from(client);
const repository = new DynamoDbProcessedEventRepository(documents, tableName);

beforeAll(async () => {
  await client.send(new CreateTableCommand(paymentsTableDefinition(tableName)));
});

afterAll(async () => {
  await client.send(new DeleteTableCommand({ TableName: tableName }));
});

describe("DynamoDbProcessedEventRepository", () => {
  it("remembers processed events for 30 days", async () => {
    expect(await repository.has("evt_1")).toBe(false);

    await repository.add("evt_1", new Date("2026-10-09T10:00:00.000Z"));

    expect(await repository.has("evt_1")).toBe(true);
    const { Item } = await documents.send(
      new GetCommand({ TableName: tableName, Key: { PK: "EVENT#evt_1", SK: "META" } }),
    );
    expect(Item).toEqual({
      PK: "EVENT#evt_1",
      SK: "META",
      receivedAt: "2026-10-09T10:00:00.000Z",
      ttl: 1_794_132_000,
    });
  });
});
