import type { Id, Locale, Page, PageRequest } from "@arrosticini/kernel";
import { DomainError, decodeCursor, encodeCursor } from "@arrosticini/kernel";
import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { type Address, type Role, User, type UserStatus } from "../domain/user.js";
import type { UserRepository } from "../domain/user-repository.js";

interface UserItem {
  userId: Id;
  kind: "user";
  email: string;
  passwordHash: string;
  salt: string;
  role: Role;
  status: UserStatus;
  firstName: string;
  lastName: string;
  preferredLocale: Locale;
  createdAt: string;
  addresses: Address[];
}

interface UserEmailItem {
  email: string;
  userId: Id;
}

function toItem(user: User): UserItem {
  return {
    userId: user.id,
    kind: "user",
    email: user.email,
    passwordHash: user.password.hash,
    salt: user.password.salt,
    role: user.role,
    status: user.status,
    firstName: user.firstName,
    lastName: user.lastName,
    preferredLocale: user.preferredLocale,
    createdAt: user.createdAt.toISOString(),
    addresses: [...user.addresses],
  };
}

function toUser(item: UserItem): User {
  return User.restore({
    id: item.userId,
    email: item.email,
    password: { hash: item.passwordHash, salt: item.salt },
    role: item.role,
    status: item.status,
    firstName: item.firstName,
    lastName: item.lastName,
    preferredLocale: item.preferredLocale,
    createdAt: new Date(item.createdAt),
    addresses: item.addresses,
  });
}

export class DynamoDbUserRepository implements UserRepository {
  readonly #client: DynamoDBDocumentClient;
  readonly #usersTable: string;
  readonly #userEmailsTable: string;

  constructor(client: DynamoDBDocumentClient, usersTable: string, userEmailsTable: string) {
    this.#client = client;
    this.#usersTable = usersTable;
    this.#userEmailsTable = userEmailsTable;
  }

  async findById(id: Id): Promise<User | undefined> {
    const { Item } = await this.#client.send(
      new GetCommand({ TableName: this.#usersTable, Key: { userId: id } }),
    );
    return Item === undefined ? undefined : toUser(Item as UserItem);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const { Item } = await this.#client.send(
      new GetCommand({ TableName: this.#userEmailsTable, Key: { email } }),
    );
    return Item === undefined ? undefined : this.findById((Item as UserEmailItem).userId);
  }

  listAll(page: PageRequest): Promise<Page<User>> {
    return this.#newestFirst("byCreatedAt", "kind", "user", page);
  }

  listByStatus(status: UserStatus, page: PageRequest): Promise<Page<User>> {
    return this.#newestFirst("byStatus", "status", status, page);
  }

  async create(user: User): Promise<void> {
    const emailItem: UserEmailItem = { email: user.email, userId: user.id };
    try {
      await this.#client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: this.#usersTable,
                Item: toItem(user),
                ConditionExpression: "attribute_not_exists(userId)",
              },
            },
            {
              Put: {
                TableName: this.#userEmailsTable,
                Item: emailItem,
                ConditionExpression: "attribute_not_exists(email)",
              },
            },
          ],
        }),
      );
    } catch (error) {
      if (
        error instanceof TransactionCanceledException &&
        error.CancellationReasons?.[1]?.Code === "ConditionalCheckFailed"
      ) {
        throw new DomainError("EMAIL_TAKEN", `Email already registered: ${user.email}`);
      }
      throw error;
    }
  }

  async save(user: User): Promise<void> {
    await this.#client.send(
      new PutCommand({
        TableName: this.#usersTable,
        Item: toItem(user),
        ConditionExpression: "attribute_exists(userId)",
      }),
    );
  }

  async #newestFirst(
    indexName: string,
    keyName: string,
    keyValue: string,
    { cursor, limit }: PageRequest,
  ): Promise<Page<User>> {
    const { Items = [], LastEvaluatedKey } = await this.#client.send(
      new QueryCommand({
        TableName: this.#usersTable,
        IndexName: indexName,
        KeyConditionExpression: "#key = :value",
        ExpressionAttributeNames: { "#key": keyName },
        ExpressionAttributeValues: { ":value": keyValue },
        ScanIndexForward: false,
        Limit: limit,
        ...(cursor === undefined
          ? {}
          : { ExclusiveStartKey: decodeCursor(cursor, ["userId", keyName, "createdAt"]) }),
      }),
    );
    return {
      items: Items.map((item) => toUser(item as UserItem)),
      ...(LastEvaluatedKey === undefined ? {} : { nextCursor: encodeCursor(LastEvaluatedKey) }),
    };
  }
}
