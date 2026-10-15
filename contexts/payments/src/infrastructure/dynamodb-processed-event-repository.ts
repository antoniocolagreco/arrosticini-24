import { type DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { ProcessedEventRepository } from "../domain/processed-event-repository.js";

export const PROCESSED_EVENT_TTL_SECONDS = 30 * 24 * 60 * 60;

function eventKey(eventId: string) {
  return { PK: `EVENT#${eventId}`, SK: "META" as const };
}

export class DynamoDbProcessedEventRepository implements ProcessedEventRepository {
  readonly #client: DynamoDBDocumentClient;
  readonly #tableName: string;

  constructor(client: DynamoDBDocumentClient, tableName: string) {
    this.#client = client;
    this.#tableName = tableName;
  }

  async has(eventId: string): Promise<boolean> {
    const { Item } = await this.#client.send(
      new GetCommand({ TableName: this.#tableName, Key: eventKey(eventId) }),
    );
    return Item !== undefined;
  }

  async add(eventId: string, now: Date): Promise<void> {
    await this.#client.send(
      new PutCommand({
        TableName: this.#tableName,
        Item: {
          ...eventKey(eventId),
          receivedAt: now.toISOString(),
          ttl: Math.floor(now.getTime() / 1000) + PROCESSED_EVENT_TTL_SECONDS,
        },
      }),
    );
  }
}
