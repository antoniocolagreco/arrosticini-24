import { randomUUID } from "node:crypto";
import { DomainError } from "@arrosticini/kernel";
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { User } from "../domain/user.js";
import { DynamoDbUserRepository } from "./dynamodb-user-repository.js";
import { identityTableDefinition } from "./identity-table.js";

const tableName = `identity-test-${randomUUID()}`;
const client = new DynamoDBClient({
  endpoint: inject("dynamodbEndpoint"),
  region: "local",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});
const repository = new DynamoDbUserRepository(DynamoDBDocumentClient.from(client), tableName);

function user(id: string, username: string): User {
  return User.register(
    {
      id,
      username,
      password: { hash: "aGFzaA==", salt: "c2FsdA==" },
      role: "customer",
      displayName: "Mario",
      preferredLocale: "en",
    },
    new Date("2026-10-08T10:00:00.000Z"),
  );
}

beforeAll(async () => {
  await client.send(new CreateTableCommand(identityTableDefinition(tableName)));
});

afterAll(async () => {
  await client.send(new DeleteTableCommand({ TableName: tableName }));
});

describe("DynamoDbUserRepository", () => {
  it("creates a user and finds it by id and username", async () => {
    const mario = user("01JB2Q7Z8X4M3N5P6R7S8T9V0W", "mario.r");

    await repository.create(mario);

    expect(await repository.findById(mario.id)).toEqual(mario);
    expect(await repository.findByUsername("mario.r")).toEqual(mario);
  });

  it("rejects a taken username", async () => {
    await repository.create(user("01JB2Q7Z8X4M3N5P6R7S8T9V0X", "luigi.v"));

    await expect(repository.create(user("01JB2Q7Z8X4M3N5P6R7S8T9V0Y", "luigi.v"))).rejects.toThrow(
      new DomainError("USERNAME_TAKEN", "Username already taken: luigi.v"),
    );
  });

  it("returns undefined for unknown users", async () => {
    expect(await repository.findById("01JB2Q7Z8X4M3N5P6R7S8T9V0Z")).toBeUndefined();
    expect(await repository.findByUsername("nobody")).toBeUndefined();
  });

  it("saves profile changes, added and removed addresses", async () => {
    const anna = user("01JB2Q7Z8X4M3N5P6R7S8T9V10", "anna.b");
    await repository.create(anna);
    anna.updateProfile({ email: "anna@example.com", preferredLocale: "it" });
    anna.addAddress(
      "01JB2Q7Z8X4M3N5P6R7S8T9V11",
      {
        fullName: "Anna Bianchi",
        line1: "Via Collegrande 10",
        city: "Chieti",
        postalCode: "66100",
        country: "IT",
      },
      false,
    );
    anna.addAddress(
      "01JB2Q7Z8X4M3N5P6R7S8T9V12",
      {
        fullName: "Anna Bianchi",
        line1: "Corso Marrucino 5",
        city: "Chieti",
        postalCode: "66100",
        country: "IT",
      },
      false,
    );
    await repository.save(anna);

    anna.removeAddress("01JB2Q7Z8X4M3N5P6R7S8T9V11");
    await repository.save(anna);

    expect(await repository.findById(anna.id)).toEqual(anna);
    expect(anna.addresses.map(({ id, isDefault }) => ({ id, isDefault }))).toEqual([
      { id: "01JB2Q7Z8X4M3N5P6R7S8T9V12", isDefault: true },
    ]);
  });
});
