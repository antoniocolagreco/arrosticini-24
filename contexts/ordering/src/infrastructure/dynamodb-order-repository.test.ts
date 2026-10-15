import { randomUUID } from "node:crypto";
import { localizedText, Money } from "@arrosticini/kernel";
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { Order } from "../domain/order.js";
import { DynamoDbOrderRepository } from "./dynamodb-order-repository.js";
import { orderingTableDefinition } from "./ordering-table.js";

const tableName = `ordering-test-${randomUUID()}`;
const client = new DynamoDBClient({
  endpoint: inject("dynamodbEndpoint"),
  region: "local",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});
const repository = new DynamoDbOrderRepository(DynamoDBDocumentClient.from(client), tableName);

function order(id: string, userId: string, createdAt: string): Order {
  return Order.place(
    {
      id,
      userId,
      lines: [
        {
          slug: "arrosticini-50",
          name: localizedText({ it: "Arrosticini classici", en: "Classic arrosticini" }),
          unitPrice: Money.ofCents(2990),
          quantity: 2,
        },
      ],
      shippingAddress: {
        fullName: "Mario Rossi",
        line1: "Via Collegrande 10",
        line2: "Scala B",
        city: "Chieti",
        postalCode: "66100",
        country: "IT",
        phone: "+39 0871 000000",
      },
    },
    new Date(createdAt),
  );
}

function plain(target: Order | undefined) {
  return (
    target && {
      id: target.id,
      userId: target.userId,
      lines: target.lines,
      shippingAddress: target.shippingAddress,
      status: target.status,
      shipment: target.shipment,
      createdAt: target.createdAt,
      paidAt: target.paidAt,
      total: target.total,
    }
  );
}

beforeAll(async () => {
  await client.send(new CreateTableCommand(orderingTableDefinition(tableName)));
});

afterAll(async () => {
  await client.send(new DeleteTableCommand({ TableName: tableName }));
});

describe("DynamoDbOrderRepository", () => {
  it("creates an order and finds it by id", async () => {
    const created = order(
      "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
      "2026-10-09T10:00:00.000Z",
    );

    await repository.create(created);

    expect(plain(await repository.findById(created.id))).toEqual(plain(created));
  });

  it("keeps the payment date of a paid order", async () => {
    const paid = order(
      "01JB2Q7Z8X4M3N5P6R7S8T9V0B",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
      "2026-10-09T10:01:00.000Z",
    );
    paid.markPaid(new Date("2026-10-09T10:03:00.000Z"));

    await repository.create(paid);

    expect(plain(await repository.findById(paid.id))).toEqual(plain(paid));
  });

  it("saves the new status of an existing order", async () => {
    const created = order(
      "01JB2Q7Z8X4M3N5P6R7S8T9V0E",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0Z",
      "2026-10-09T09:00:00.000Z",
    );
    await repository.create(created);

    created.cancel();
    await repository.save(created);

    expect((await repository.findById(created.id))?.status).toBe("CANCELLED");
  });

  it("saves the shipment and the new address of a shipped order", async () => {
    const shipped = order(
      "01JB2Q7Z8X4M3N5P6R7S8T9V0G",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
      "2026-10-09T09:30:00.000Z",
    );
    await repository.create(shipped);

    shipped.markPaid(new Date("2026-10-09T09:32:00.000Z"));
    shipped.changeShippingAddress({
      fullName: "Mario Rossi",
      line1: "Via Arniense 21",
      city: "Chieti",
      postalCode: "66100",
      country: "IT",
      phone: "+39 0871 000000",
    });
    shipped.ship({
      carrier: "BRT",
      trackingNumber: "BRT0001",
      trackingUrl: "https://vas.brt.it/vas/sped_det_show.hsm?brtCode=BRT0001",
    });
    await repository.save(shipped);

    expect(plain(await repository.findById(shipped.id))).toEqual(plain(shipped));
  });

  it("refuses to save an order that was never created", async () => {
    await expect(
      repository.save(
        order(
          "01JB2Q7Z8X4M3N5P6R7S8T9V0F",
          "01JB2Q7Z8X4M3N5P6R7S8T9V0Z",
          "2026-10-09T09:00:00.000Z",
        ),
      ),
    ).rejects.toThrow();
  });

  it("returns undefined for an unknown order", async () => {
    expect(await repository.findById("01JB2Q7Z8X4M3N5P6R7S8T9V0Z")).toBeUndefined();
  });

  it("refuses to overwrite an existing order", async () => {
    await expect(
      repository.create(
        order(
          "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
          "01JB2Q7Z8X4M3N5P6R7S8T9V0Y",
          "2026-10-09T11:00:00.000Z",
        ),
      ),
    ).rejects.toThrow();
  });

  it("lists the orders of a user and all orders, newest first", async () => {
    await repository.create(
      order("01JB2Q7Z8X4M3N5P6R7S8T9V0C", "01JB2Q7Z8X4M3N5P6R7S8T9V0Y", "2026-10-09T10:02:00.000Z"),
    );
    await repository.create(
      order("01JB2Q7Z8X4M3N5P6R7S8T9V0D", "01JB2Q7Z8X4M3N5P6R7S8T9V0X", "2026-10-09T10:04:00.000Z"),
    );

    const mine = await repository.listByUser("01JB2Q7Z8X4M3N5P6R7S8T9V0X");
    const all = await repository.listAll();

    expect(mine.map(({ id }) => id)).toEqual([
      "01JB2Q7Z8X4M3N5P6R7S8T9V0D",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0B",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    ]);
    expect(all.map(({ id }) => id)).toEqual([
      "01JB2Q7Z8X4M3N5P6R7S8T9V0D",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0C",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0B",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0G",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0E",
    ]);
  });
});
