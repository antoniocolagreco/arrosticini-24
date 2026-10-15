import { randomUUID } from "node:crypto";
import { DomainError } from "@arrosticini/kernel";
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
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
const documents = DynamoDBDocumentClient.from(client);
const repository = new DynamoDbUserRepository(documents, tableName);

function user(id: string, email: string): User {
  return User.register(
    {
      id,
      email,
      password: { hash: "aGFzaA==", salt: "c2FsdA==" },
      role: "customer",
      firstName: "Mario",
      lastName: "Rossi",
      preferredLocale: "en",
    },
    new Date("2026-10-08T10:00:00.000Z"),
  );
}

function plain(target: User | undefined) {
  return (
    target && {
      id: target.id,
      email: target.email,
      password: target.password,
      role: target.role,
      status: target.status,
      firstName: target.firstName,
      lastName: target.lastName,
      preferredLocale: target.preferredLocale,
      createdAt: target.createdAt,
      addresses: target.addresses,
    }
  );
}

beforeAll(async () => {
  await client.send(new CreateTableCommand(identityTableDefinition(tableName)));
});

afterAll(async () => {
  await client.send(new DeleteTableCommand({ TableName: tableName }));
});

describe("DynamoDbUserRepository", () => {
  it("creates a user and finds it by id and email", async () => {
    const mario = user("01JB2Q7Z8X4M3N5P6R7S8T9V0W", "mario.rossi@example.com");

    await repository.create(mario);

    expect(plain(await repository.findById(mario.id))).toEqual(plain(mario));
    expect(plain(await repository.findByEmail("mario.rossi@example.com"))).toEqual(plain(mario));
  });

  it("rejects an email that is already registered", async () => {
    await repository.create(user("01JB2Q7Z8X4M3N5P6R7S8T9V0X", "luigi.verdi@example.com"));

    await expect(
      repository.create(user("01JB2Q7Z8X4M3N5P6R7S8T9V0Y", "luigi.verdi@example.com")),
    ).rejects.toThrow(
      new DomainError("EMAIL_TAKEN", "Email already registered: luigi.verdi@example.com"),
    );
  });

  it("returns undefined for unknown users", async () => {
    expect(await repository.findById("01JB2Q7Z8X4M3N5P6R7S8T9V0Z")).toBeUndefined();
    expect(await repository.findByEmail("nobody@example.com")).toBeUndefined();
  });

  it("saves profile changes, added and removed addresses", async () => {
    const anna = user("01JB2Q7Z8X4M3N5P6R7S8T9V10", "anna.bianchi@example.com");
    await repository.create(anna);
    anna.updateProfile({ firstName: "Anna", lastName: "Bianchi", preferredLocale: "it" });
    anna.addAddress(
      "01JB2Q7Z8X4M3N5P6R7S8T9V11",
      {
        fullName: "Anna Bianchi",
        line1: "Via Collegrande 10",
        city: "Chieti",
        postalCode: "66100",
        country: "IT",
        phone: "+39 333 0000001",
      },
      false,
    );
    anna.addAddress(
      "01JB2Q7Z8X4M3N5P6R7S8T9V12",
      {
        fullName: "Giulia Bianchi",
        line1: "Corso Marrucino 5",
        city: "Chieti",
        postalCode: "66100",
        country: "IT",
        phone: "+39 333 0000002",
      },
      false,
    );
    await repository.save(anna);

    anna.removeAddress("01JB2Q7Z8X4M3N5P6R7S8T9V11");
    await repository.save(anna);

    expect(plain(await repository.findById(anna.id))).toEqual(plain(anna));
    expect(anna.firstName).toBe("Anna");
    expect(anna.addresses.map(({ id, isDefault }) => ({ id, isDefault }))).toEqual([
      { id: "01JB2Q7Z8X4M3N5P6R7S8T9V12", isDefault: true },
    ]);
  });

  it("saves the suspension and reads profiles without a status as active", async () => {
    const paolo = user("01JB2Q7Z8X4M3N5P6R7S8T9V13", "paolo.neri@example.com");
    await repository.create(paolo);
    paolo.suspend();
    await repository.save(paolo);
    await documents.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: "USER#01JB2Q7Z8X4M3N5P6R7S8T9V14",
          SK: "PROFILE",
          id: "01JB2Q7Z8X4M3N5P6R7S8T9V14",
          email: "rosa.gialli@example.com",
          passwordHash: "aGFzaA==",
          salt: "c2FsdA==",
          role: "customer",
          firstName: "Rosa",
          lastName: "Gialli",
          preferredLocale: "it",
          createdAt: "2026-10-08T10:00:00.000Z",
        },
      }),
    );

    expect((await repository.findById(paolo.id))?.status).toBe("SUSPENDED");
    expect((await repository.findById("01JB2Q7Z8X4M3N5P6R7S8T9V14"))?.status).toBe("ACTIVE");
  });

  it("lists every user with addresses, newest first", async () => {
    const elena = User.register(
      {
        id: "01JB2Q7Z8X4M3N5P6R7S8T9V15",
        email: "elena.russo@example.com",
        password: { hash: "aGFzaA==", salt: "c2FsdA==" },
        role: "customer",
        firstName: "Elena",
        lastName: "Russo",
        preferredLocale: "it",
      },
      new Date("2026-10-09T09:00:00.000Z"),
    );
    const franco = User.register(
      {
        id: "01JB2Q7Z8X4M3N5P6R7S8T9V16",
        email: "franco.esposito@example.com",
        password: { hash: "aGFzaA==", salt: "c2FsdA==" },
        role: "customer",
        firstName: "Franco",
        lastName: "Esposito",
        preferredLocale: "en",
      },
      new Date("2026-10-09T11:00:00.000Z"),
    );
    await repository.create(elena);
    await repository.create(franco);
    elena.addAddress(
      "01JB2Q7Z8X4M3N5P6R7S8T9V17",
      {
        fullName: "Elena Russo",
        line1: "Via dei Frentani 3",
        city: "Lanciano",
        postalCode: "66034",
        country: "IT",
        phone: "+39 333 0000003",
      },
      false,
    );
    await repository.save(elena);

    const users = await repository.listAll();

    expect(users.slice(0, 2).map(plain)).toEqual([plain(franco), plain(elena)]);
    expect(users.map(({ email }) => email)).toEqual(
      expect.arrayContaining(["mario.rossi@example.com", "anna.bianchi@example.com"]),
    );
    expect(new Set(users.map(({ id }) => id)).size).toBe(users.length);
  });
});
