import type { Id, Locale } from "@arrosticini/kernel";
import { DomainError } from "@arrosticini/kernel";
import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import {
  type DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { type Address, type Role, User } from "../domain/user.js";
import type { UserRepository } from "../domain/user-repository.js";

interface ProfileItem {
  PK: string;
  SK: "PROFILE";
  id: Id;
  username: string;
  passwordHash: string;
  salt: string;
  role: Role;
  displayName?: string;
  email?: string;
  preferredLocale: Locale;
  createdAt: string;
}

type AddressItem = Address & { PK: string; SK: string };

type TransactItem = NonNullable<TransactWriteCommandInput["TransactItems"]>[number];

const userPk = (id: Id) => `USER#${id}`;
const usernamePk = (username: string) => `USERNAME#${username}`;
const addressSk = (id: Id) => `ADDRESS#${id}`;

function profileItem(user: User): ProfileItem {
  return {
    PK: userPk(user.id),
    SK: "PROFILE",
    id: user.id,
    username: user.username,
    passwordHash: user.password.hash,
    salt: user.password.salt,
    role: user.role,
    ...(user.displayName === undefined ? {} : { displayName: user.displayName }),
    ...(user.email === undefined ? {} : { email: user.email }),
    preferredLocale: user.preferredLocale,
    createdAt: user.createdAt.toISOString(),
  };
}

function toAddress({ PK: _pk, SK: _sk, ...address }: AddressItem): Address {
  return address;
}

export class DynamoDbUserRepository implements UserRepository {
  readonly #client: DynamoDBDocumentClient;
  readonly #tableName: string;

  constructor(client: DynamoDBDocumentClient, tableName: string) {
    this.#client = client;
    this.#tableName = tableName;
  }

  async findById(id: Id): Promise<User | undefined> {
    const { Items = [] } = await this.#client.send(
      new QueryCommand({
        TableName: this.#tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": userPk(id) },
      }),
    );
    const profile = Items.find((item) => item.SK === "PROFILE") as ProfileItem | undefined;
    if (profile === undefined) {
      return undefined;
    }
    const addresses = Items.filter((item) => String(item.SK).startsWith("ADDRESS#")).map((item) =>
      toAddress(item as AddressItem),
    );
    return User.restore({
      id: profile.id,
      username: profile.username,
      password: { hash: profile.passwordHash, salt: profile.salt },
      role: profile.role,
      ...(profile.displayName === undefined ? {} : { displayName: profile.displayName }),
      ...(profile.email === undefined ? {} : { email: profile.email }),
      preferredLocale: profile.preferredLocale,
      createdAt: new Date(profile.createdAt),
      addresses,
    });
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const { Item } = await this.#client.send(
      new GetCommand({
        TableName: this.#tableName,
        Key: { PK: usernamePk(username), SK: "LOOKUP" },
      }),
    );
    return Item === undefined ? undefined : this.findById(Item.userId as Id);
  }

  async create(user: User): Promise<void> {
    try {
      await this.#client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: this.#tableName,
                Item: profileItem(user),
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
            {
              Put: {
                TableName: this.#tableName,
                Item: { PK: usernamePk(user.username), SK: "LOOKUP", userId: user.id },
                ConditionExpression: "attribute_not_exists(PK)",
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
        throw new DomainError("USERNAME_TAKEN", `Username already taken: ${user.username}`);
      }
      throw error;
    }
  }

  async save(user: User): Promise<void> {
    const { Items = [] } = await this.#client.send(
      new QueryCommand({
        TableName: this.#tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :address)",
        ExpressionAttributeValues: { ":pk": userPk(user.id), ":address": "ADDRESS#" },
        ProjectionExpression: "SK",
      }),
    );
    const kept = new Set(user.addresses.map(({ id }) => addressSk(id)));
    const items: TransactItem[] = [
      {
        Put: {
          TableName: this.#tableName,
          Item: profileItem(user),
          ConditionExpression: "attribute_exists(PK)",
        },
      },
      ...user.addresses.map(
        (address): TransactItem => ({
          Put: {
            TableName: this.#tableName,
            Item: { ...address, PK: userPk(user.id), SK: addressSk(address.id) },
          },
        }),
      ),
      ...Items.filter((item) => !kept.has(String(item.SK))).map(
        (item): TransactItem => ({
          Delete: { TableName: this.#tableName, Key: { PK: userPk(user.id), SK: item.SK } },
        }),
      ),
    ];
    await this.#client.send(new TransactWriteCommand({ TransactItems: items }));
  }
}
