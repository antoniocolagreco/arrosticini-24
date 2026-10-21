import { randomUUID } from "node:crypto";
import { DomainError } from "@arrosticini/kernel";
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { User } from "../domain/user.js";
import { DynamoDbUserRepository } from "./dynamodb-user-repository.js";
import { userEmailsTableDefinition } from "./user-emails-table.js";
import { usersTableDefinition } from "./users-table.js";

const usersTable = `users-test-${randomUUID()}`;
const userEmailsTable = `user-emails-test-${randomUUID()}`;
const client = new DynamoDBClient({
  endpoint: inject("dynamodbEndpoint"),
  region: "local",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});
const repository = new DynamoDbUserRepository(
  DynamoDBDocumentClient.from(client),
  usersTable,
  userEmailsTable,
);

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
  await client.send(new CreateTableCommand(usersTableDefinition(usersTable)));
  await client.send(new CreateTableCommand(userEmailsTableDefinition(userEmailsTable)));
});

afterAll(async () => {
  await client.send(new DeleteTableCommand({ TableName: usersTable }));
  await client.send(new DeleteTableCommand({ TableName: userEmailsTable }));
});

describe("DynamoDbUserRepository", () => {
  it("creates a user and finds it by id and email", async () => {
    const mario = user("0192e1a0-0000-7000-8000-000000000012", "mario.rossi@example.com");

    await repository.create(mario);

    expect(plain(await repository.findById(mario.id))).toEqual(plain(mario));
    expect(plain(await repository.findByEmail("mario.rossi@example.com"))).toEqual(plain(mario));
  });

  it("rejects an email that is already registered", async () => {
    await repository.create(
      user("0192e1a0-0000-7000-8000-000000000013", "luigi.verdi@example.com"),
    );

    await expect(
      repository.create(user("0192e1a0-0000-7000-8000-000000000014", "luigi.verdi@example.com")),
    ).rejects.toThrow(
      new DomainError("EMAIL_TAKEN", "Email already registered: luigi.verdi@example.com"),
    );
  });

  it("returns undefined for unknown users", async () => {
    expect(await repository.findById("0192e1a0-0000-7000-8000-000000000015")).toBeUndefined();
    expect(await repository.findByEmail("nobody@example.com")).toBeUndefined();
  });

  it("saves profile changes, added and removed addresses", async () => {
    const anna = user("0192e1a0-0000-7000-8000-000000000016", "anna.bianchi@example.com");
    await repository.create(anna);
    anna.updateProfile({ firstName: "Anna", lastName: "Bianchi", preferredLocale: "it" });
    anna.addAddress(
      "0192e1a0-0000-7000-8000-000000000017",
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
      "0192e1a0-0000-7000-8000-000000000018",
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

    anna.removeAddress("0192e1a0-0000-7000-8000-000000000017");
    await repository.save(anna);

    expect(plain(await repository.findById(anna.id))).toEqual(plain(anna));
    expect(anna.firstName).toBe("Anna");
    expect(anna.addresses.map(({ id, isDefault }) => ({ id, isDefault }))).toEqual([
      { id: "0192e1a0-0000-7000-8000-000000000018", isDefault: true },
    ]);
  });

  it("saves the suspension and lists users by status", async () => {
    const paolo = user("0192e1a0-0000-7000-8000-000000000019", "paolo.neri@example.com");
    await repository.create(paolo);
    paolo.suspend();
    await repository.save(paolo);

    const { items, nextCursor } = await repository.listByStatus("SUSPENDED", { limit: 20 });

    expect((await repository.findById(paolo.id))?.status).toBe("SUSPENDED");
    expect(items.map(plain)).toEqual([plain(paolo)]);
    expect(nextCursor).toBeUndefined();
  });

  it("lists every user with addresses, newest first, one page at a time", async () => {
    const elena = User.register(
      {
        id: "0192e1a0-0000-7000-8000-00000000001b",
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
        id: "0192e1a0-0000-7000-8000-00000000001c",
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
      "0192e1a0-0000-7000-8000-00000000001d",
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

    const first = await repository.listAll({ limit: 2 });
    const rest = await repository.listAll({ cursor: first.nextCursor, limit: 20 });
    const users = [...first.items, ...rest.items];

    expect(first.items.map(plain)).toEqual([plain(franco), plain(elena)]);
    expect(rest.nextCursor).toBeUndefined();
    expect(users.map(({ email }) => email)).toEqual(
      expect.arrayContaining(["mario.rossi@example.com", "anna.bianchi@example.com"]),
    );
    expect(new Set(users.map(({ id }) => id)).size).toBe(users.length);
  });

  it("rejects a cursor of another index", async () => {
    const { nextCursor } = await repository.listAll({ limit: 1 });

    await expect(
      repository.listByStatus("ACTIVE", { cursor: nextCursor, limit: 1 }),
    ).rejects.toThrow(new DomainError("INVALID_CURSOR", "Invalid cursor"));
  });
});
