import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  catalogTableDefinition,
  DynamoDbProductRepository,
  Product,
  type ProductStatus,
} from "@arrosticini/catalog";
import { ACTOR_HEADER, contract } from "@arrosticini/contracts";
import { identityTableDefinition } from "@arrosticini/identity";
import { localizedText, Money } from "@arrosticini/kernel";
import { createLogger, Lifecycle } from "@arrosticini/ops";
import { CreateTableCommand, DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import { createORPCClient, ORPCError } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { Valkey } from "iovalkey";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { createApp } from "./app.js";
import { createDynamoDbClient } from "./aws.js";
import { createRouter } from "./wiring.js";

const logger = createLogger(
  { service: "api", version: "test", level: "silent", pretty: false },
  { write: () => {} },
);
const tables = {
  catalog: `catalog-test-${randomUUID()}`,
  identity: `identity-test-${randomUUID()}`,
};
const dynamo = createDynamoDbClient("local", inject("dynamodbEndpoint"));
const valkey = new Valkey(inject("valkeyUrl"));
const app = createApp(logger, new Lifecycle(), createRouter(dynamo, valkey, tables));
let server: Server;

function client(actor?: { userId: string; role: "customer" | "admin" }) {
  const { port } = server.address() as AddressInfo;
  const link = new OpenAPILink(contract, {
    url: `http://127.0.0.1:${port}`,
    headers: actor === undefined ? {} : { [ACTOR_HEADER]: JSON.stringify(actor) },
  });
  return createORPCClient<ContractRouterClient<typeof contract>>(link);
}

const admin = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0W", role: "admin" } as const;
const customer = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X", role: "customer" } as const;

function product(slug: string, priceCents: number, status: ProductStatus): Product {
  return Product.create(
    {
      slug,
      name: localizedText({ it: `Prodotto ${slug}`, en: `Product ${slug}` }),
      description: localizedText({ it: "Fatto in Abruzzo", en: "Made in Abruzzo" }),
      price: Money.ofCents(priceCents),
      images: [],
      status,
    },
    new Date("2026-10-08T10:00:00.000Z"),
  );
}

beforeAll(async () => {
  await dynamo.send(new CreateTableCommand(catalogTableDefinition(tables.catalog)));
  await dynamo.send(new CreateTableCommand(identityTableDefinition(tables.identity)));
  const products = new DynamoDbProductRepository(dynamo, tables.catalog);
  await products.create(product("fornacella", 10000, "ACTIVE"));
  await products.create(product("vino", 500, "ACTIVE"));
  await products.create(product("carbone", 2000, "DRAFT"));
  server = app.listen(0);
});

afterAll(async () => {
  server.close();
  await dynamo.send(new DeleteTableCommand({ TableName: tables.catalog }));
  await dynamo.send(new DeleteTableCommand({ TableName: tables.identity }));
  await valkey.quit();
});

describe("GET /healthz", () => {
  it("answers 200 with a request id", async () => {
    const response = await request(app).get("/healthz");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
  });
});

describe("catalog", () => {
  it("lists active products, cheapest first", async () => {
    const { items } = await client().catalog.listProducts({});

    expect(items.map(({ slug }) => slug)).toEqual(["vino", "fornacella"]);
    expect(items[0]).toEqual({
      slug: "vino",
      name: { it: "Prodotto vino", en: "Product vino" },
      description: { it: "Fatto in Abruzzo", en: "Made in Abruzzo" },
      priceCents: 500,
      currency: "EUR",
      images: [],
      status: "ACTIVE",
      updatedAt: "2026-10-08T10:00:00.000Z",
    });
  });

  it("searches products", async () => {
    const { items } = await client().catalog.listProducts({ q: "fornacella" });

    expect(items.map(({ slug }) => slug)).toEqual(["fornacella"]);
  });

  it("lets admins filter by status", async () => {
    const { items } = await client(admin).catalog.listProducts({ status: "DRAFT" });

    expect(items.map(({ slug }) => slug)).toEqual(["carbone"]);
  });

  it("answers FORBIDDEN when a customer filters by status", async () => {
    const error = await client(customer)
      .catalog.listProducts({ status: "DRAFT" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ORPCError);
    expect(error).toMatchObject({ code: "FORBIDDEN", status: 403, defined: true });
  });

  it("gets a product by slug", async () => {
    const found = await client().catalog.getProduct({ slug: "vino" });

    expect(found.slug).toBe("vino");
  });

  it("answers PRODUCT_NOT_FOUND for a draft product", async () => {
    const error = await client()
      .catalog.getProduct({ slug: "carbone" })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "PRODUCT_NOT_FOUND", status: 404, defined: true });
  });

  it("answers BAD_REQUEST with the invalid fields", async () => {
    const response = await request(app).get("/catalog/products/Not_A_Slug");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "BAD_REQUEST",
      data: { issues: [{ path: ["slug"], message: expect.any(String) }] },
    });
  });

  it("answers BAD_REQUEST on an invalid actor header", async () => {
    const response = await request(app).get("/catalog/products").set(ACTOR_HEADER, "admin");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("identity", () => {
  const address = {
    fullName: "Mario Rossi",
    line1: "Via Collegrande 10",
    line2: "Interno 3",
    city: "Chieti",
    postalCode: "66100",
    country: "IT",
  };
  let mario: { userId: string; role: "customer" };

  beforeAll(async () => {
    const registered = await client().identity.registerUser({
      username: " Mario.R ",
      password: "arrosticini-24",
      preferredLocale: "it",
    });
    mario = { userId: registered.id, role: "customer" };
  });

  it("registers customers with a normalized username", async () => {
    const registered = await client().identity.registerUser({
      username: "Luigi.V",
      password: "arrosticini-24",
      preferredLocale: "en",
      displayName: "Luigi",
    });

    expect(registered).toEqual({
      id: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{26}$/),
      username: "luigi.v",
      role: "customer",
      displayName: "Luigi",
      preferredLocale: "en",
      createdAt: expect.any(String),
    });
  });

  it("answers USERNAME_TAKEN on a duplicate username", async () => {
    const error = await client()
      .identity.registerUser({
        username: "mario.r",
        password: "arrosticini-24",
        preferredLocale: "it",
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "USERNAME_TAKEN", status: 409, defined: true });
  });

  it("verifies credentials", async () => {
    const verified = await client().identity.verifyCredentials({
      username: "mario.r",
      password: "arrosticini-24",
    });

    expect(verified).toMatchObject({ id: mario.userId, role: "customer", preferredLocale: "it" });
  });

  it("answers INVALID_CREDENTIALS on a wrong password or unknown user", async () => {
    const wrongPassword = await client()
      .identity.verifyCredentials({ username: "mario.r", password: "wrong-password" })
      .catch((caught: unknown) => caught);
    const unknownUser = await client()
      .identity.verifyCredentials({ username: "nobody", password: "arrosticini-24" })
      .catch((caught: unknown) => caught);

    expect(wrongPassword).toMatchObject({
      code: "INVALID_CREDENTIALS",
      status: 401,
      defined: true,
    });
    expect(unknownUser).toMatchObject({ code: "INVALID_CREDENTIALS", status: 401, defined: true });
  });

  it("answers UNAUTHORIZED without an actor", async () => {
    const error = await client()
      .identity.getMe()
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "UNAUTHORIZED", status: 401, defined: true });
  });

  it("updates the profile", async () => {
    const updated = await client(mario).identity.updateMe({
      email: "mario@example.com",
      preferredLocale: "en",
    });

    expect(updated).toMatchObject({ email: "mario@example.com", preferredLocale: "en" });
    expect(await client(mario).identity.getMe()).toEqual(updated);
  });

  it("changes the password only with the current one", async () => {
    const error = await client(mario)
      .identity.changePassword({
        currentPassword: "wrong-password",
        newPassword: "pecora-in-overdrive",
      })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: "INVALID_CURRENT_PASSWORD", status: 422, defined: true });

    await client(mario).identity.changePassword({
      currentPassword: "arrosticini-24",
      newPassword: "pecora-in-overdrive",
    });

    const verified = await client().identity.verifyCredentials({
      username: "mario.r",
      password: "pecora-in-overdrive",
    });
    expect(verified.id).toBe(mario.userId);
  });

  it("manages addresses up to the limit", async () => {
    const first = await client(mario).identity.addAddress(address);
    expect(first).toEqual({ ...address, id: expect.any(String), isDefault: true });

    const updated = await client(mario).identity.updateAddress({
      id: first.id,
      city: "Pescara",
      line2: null,
    });
    expect(updated).toEqual({
      id: first.id,
      fullName: "Mario Rossi",
      line1: "Via Collegrande 10",
      city: "Pescara",
      postalCode: "66100",
      country: "IT",
      isDefault: true,
    });

    for (let index = 0; index < 4; index += 1) {
      await client(mario).identity.addAddress(address);
    }
    const limit = await client(mario)
      .identity.addAddress(address)
      .catch((caught: unknown) => caught);
    expect(limit).toMatchObject({ code: "ADDRESS_LIMIT_REACHED", status: 409, defined: true });

    await client(mario).identity.deleteAddress({ id: first.id });
    const { items } = await client(mario).identity.listAddresses();
    expect(items).toHaveLength(4);
    expect(items[0]?.isDefault).toBe(true);
  });

  it("answers ADDRESS_NOT_FOUND on an unknown address", async () => {
    const error = await client(mario)
      .identity.deleteAddress({ id: "01JB2Q7Z8X4M3N5P6R7S8T9V99" })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "ADDRESS_NOT_FOUND", status: 404, defined: true });
  });
});

describe("shopping", () => {
  const lucia = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y", role: "customer" } as const;

  it("creates an empty cart and sets its lines", async () => {
    const created = await client().shopping.createCart();
    expect(created.lines).toEqual([]);

    await client().shopping.setCartLine({ id: created.id, slug: "vino", quantity: 2 });
    await client().shopping.setCartLine({ id: created.id, slug: "fornacella", quantity: 1 });
    await client().shopping.setCartLine({ id: created.id, slug: "vino", quantity: 0 });

    const cart = await client().shopping.getCart({ id: created.id });
    expect(cart).toEqual({
      id: created.id,
      lines: [{ slug: "fornacella", quantity: 1 }],
      updatedAt: expect.any(String),
    });
  });

  it("answers 201 on cart creation", async () => {
    const response = await request(app).post("/shopping/carts");

    expect(response.status).toBe(201);
  });

  it("rejects products that are not on sale", async () => {
    const { id } = await client().shopping.createCart();

    for (const slug of ["carbone", "pecora-diy"]) {
      const error = await client()
        .shopping.setCartLine({ id, slug, quantity: 1 })
        .catch((caught: unknown) => caught);
      expect(error).toMatchObject({ code: "PRODUCT_NOT_FOUND", status: 404, defined: true });
    }
  });

  it("rejects quantities over 99", async () => {
    const { id } = await client().shopping.createCart();
    const response = await request(app)
      .put(`/shopping/carts/${id}/lines/vino`)
      .send({ quantity: 100 });

    expect(response.status).toBe(400);
  });

  it("answers CART_NOT_FOUND on an unknown cart", async () => {
    const error = await client()
      .shopping.getCart({ id: "01JB2Q7Z8X4M3N5P6R7S8T9V98" })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "CART_NOT_FOUND", status: 404, defined: true });
  });

  it("requires a signed-in user to merge", async () => {
    const { id } = await client().shopping.createCart();
    const error = await client()
      .shopping.mergeCart({ id })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "UNAUTHORIZED", status: 401, defined: true });
  });

  it("merges the anonymous cart into the user's cart at login", async () => {
    const first = await client().shopping.createCart();
    await client().shopping.setCartLine({ id: first.id, slug: "vino", quantity: 2 });
    const owned = await client(lucia).shopping.mergeCart({ id: first.id });
    expect(owned.id).toBe(first.id);

    const second = await client().shopping.createCart();
    await client().shopping.setCartLine({ id: second.id, slug: "vino", quantity: 1 });
    await client().shopping.setCartLine({ id: second.id, slug: "fornacella", quantity: 1 });
    const merged = await client(lucia).shopping.mergeCart({ id: second.id });

    expect(merged.id).toBe(first.id);
    expect(merged.lines).toEqual([
      { slug: "vino", quantity: 3 },
      { slug: "fornacella", quantity: 1 },
    ]);
    const gone = await client()
      .shopping.getCart({ id: second.id })
      .catch((caught: unknown) => caught);
    expect(gone).toMatchObject({ code: "CART_NOT_FOUND" });
  });
});

describe("unknown paths", () => {
  it("answers 404", async () => {
    const response = await request(app).get("/unknown");

    expect(response.status).toBe(404);
  });
});
