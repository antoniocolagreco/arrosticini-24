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
import { DynamoDbUserRepository, identityTableDefinition, User } from "@arrosticini/identity";
import { localizedText, Money } from "@arrosticini/kernel";
import { createLogger, Lifecycle } from "@arrosticini/ops";
import { orderingTableDefinition } from "@arrosticini/ordering";
import { paymentsTableDefinition } from "@arrosticini/payments";
import { S3_TEST_CREDENTIALS } from "@arrosticini/testing";
import { CreateTableCommand, DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  S3Client,
} from "@aws-sdk/client-s3";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { createORPCClient, ORPCError } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { Valkey } from "iovalkey";
import Stripe from "stripe";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { createApp } from "./app.js";
import { createDynamoDbClient } from "./aws.js";
import { createApi } from "./wiring.js";

const logger = createLogger(
  { service: "api", version: "test", level: "silent", pretty: false },
  { write: () => {} },
);
const tables = {
  catalog: `catalog-test-${randomUUID()}`,
  identity: `identity-test-${randomUUID()}`,
  ordering: `ordering-test-${randomUUID()}`,
  payments: `payments-test-${randomUUID()}`,
};
const mediaBucket = `media-test-${randomUUID()}`;
const stripeWebhookSecret = "whsec_arrosticini";
const dynamo = createDynamoDbClient("local", inject("dynamodbEndpoint"));
const s3 = new S3Client({
  endpoint: inject("s3Endpoint"),
  region: "local",
  forcePathStyle: true,
  credentials: S3_TEST_CREDENTIALS,
});
const valkey = new Valkey(inject("valkeyUrl"));
const stripe = new Stripe("sk_test_arrosticini", { ...inject("stripeMock"), protocol: "http" });
const app = createApp(
  logger,
  new Lifecycle(),
  createApi(
    { dynamo, s3, valkey, stripe },
    {
      tables,
      mediaBucket,
      stripeWebhookSecret,
      whoami: () => ({
        service: "api",
        version: "v1.0.0",
        taskId: "4f1c2b9e8d7a4e3f9a1b",
        availabilityZone: "eu-south-1a",
        cpuPercent: 12.5,
        startedAt: "2026-10-09T10:00:00.000Z",
      }),
    },
  ),
);
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
  await dynamo.send(new CreateTableCommand(orderingTableDefinition(tables.ordering)));
  await dynamo.send(new CreateTableCommand(paymentsTableDefinition(tables.payments)));
  await s3.send(new CreateBucketCommand({ Bucket: mediaBucket }));
  const products = new DynamoDbProductRepository(dynamo, tables.catalog);
  await products.create(product("fornacella", 10000, "ACTIVE"));
  await products.create(product("vino", 500, "ACTIVE"));
  await products.create(product("carbone", 2000, "DRAFT"));
  const users = new DynamoDbUserRepository(dynamo, tables.identity);
  const registeredAt = new Date("2026-10-08T10:00:00.000Z");
  const password = { hash: "aGFzaA==", salt: "c2FsdA==" };
  await users.create(
    User.register(
      {
        id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
        email: "admin@example.com",
        password,
        role: "admin",
        firstName: "Admin",
        lastName: "Arrosticini 24ore",
        preferredLocale: "it",
      },
      registeredAt,
    ),
  );
  await users.create(
    User.register(
      {
        id: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
        email: "carla.conti@example.com",
        password,
        role: "customer",
        firstName: "Carla",
        lastName: "Conti",
        preferredLocale: "it",
      },
      registeredAt,
    ),
  );
  await users.create(
    User.register(
      {
        id: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y",
        email: "lucia.ferri@example.com",
        password,
        role: "customer",
        firstName: "Lucia",
        lastName: "Ferri",
        preferredLocale: "en",
      },
      registeredAt,
    ),
  );
  await users.create(
    User.register(
      {
        id: "01JB2Q7Z8X4M3N5P6R7S8T9V0V",
        email: "stefano.greco@example.com",
        password,
        role: "customer",
        firstName: "Stefano",
        lastName: "Greco",
        preferredLocale: "it",
      },
      registeredAt,
    ),
  );
  server = app.listen(0);
});

afterAll(async () => {
  server.close();
  await dynamo.send(new DeleteTableCommand({ TableName: tables.catalog }));
  await dynamo.send(new DeleteTableCommand({ TableName: tables.identity }));
  await dynamo.send(new DeleteTableCommand({ TableName: tables.ordering }));
  await dynamo.send(new DeleteTableCommand({ TableName: tables.payments }));
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

describe("catalog administration", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const salsiccia = {
    slug: "salsiccia",
    name: { it: "Salsiccia di fegato", en: "Liver sausage" },
    description: { it: "Specialità teramana", en: "A Teramo speciality" },
    priceCents: 1200,
  };

  it("creates a draft product hidden from customers", async () => {
    const response = await request(app)
      .post("/catalog/products")
      .set(ACTOR_HEADER, JSON.stringify(admin))
      .send(salsiccia);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      ...salsiccia,
      currency: "EUR",
      images: [],
      status: "DRAFT",
      updatedAt: expect.any(String),
    });
    const hidden = await client()
      .catalog.getProduct({ slug: "salsiccia" })
      .catch((caught: unknown) => caught);
    expect(hidden).toMatchObject({ code: "PRODUCT_NOT_FOUND", status: 404 });
  });

  it("answers PRODUCT_SLUG_TAKEN on a slug already used", async () => {
    const error = await client(admin)
      .catalog.createProduct(salsiccia)
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "PRODUCT_SLUG_TAKEN", status: 409, defined: true });
  });

  it("reserves product management to admins", async () => {
    const anonymous = await client()
      .catalog.createProduct({ ...salsiccia, slug: "ventricina" })
      .catch((caught: unknown) => caught);
    const forbidden = await client(customer)
      .catalog.updateProduct({ slug: "salsiccia", priceCents: 1 })
      .catch((caught: unknown) => caught);

    expect(anonymous).toMatchObject({ code: "UNAUTHORIZED", status: 401, defined: true });
    expect(forbidden).toMatchObject({ code: "FORBIDDEN", status: 403, defined: true });
  });

  it("updates and publishes a product", async () => {
    const updated = await client(admin).catalog.updateProduct({
      slug: "salsiccia",
      pieces: 4,
      priceCents: 1350,
      status: "ACTIVE",
    });

    expect(updated).toMatchObject({ pieces: 4, priceCents: 1350, status: "ACTIVE" });
    expect(await client().catalog.getProduct({ slug: "salsiccia" })).toEqual(updated);

    const cleared = await client(admin).catalog.updateProduct({ slug: "salsiccia", pieces: null });
    expect(cleared).not.toHaveProperty("pieces");
  });

  it("answers PRODUCT_NOT_FOUND when updating an unknown product", async () => {
    const error = await client(admin)
      .catalog.updateProduct({ slug: "pecora-volante", priceCents: 1 })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "PRODUCT_NOT_FOUND", status: 404, defined: true });
  });

  it("uploads an image to S3 and removes it", async () => {
    const withImage = await client(admin).catalog.addProductImage({
      slug: "salsiccia",
      file: new File([png], "salsiccia.png", { type: "image/png" }),
    });

    const [image] = withImage.images;
    expect(image?.key).toBe(`products/salsiccia/${image?.id}.png`);
    const stored = await s3.send(new GetObjectCommand({ Bucket: mediaBucket, Key: image?.key }));
    expect(stored.ContentType).toBe("image/png");
    expect(await stored.Body?.transformToByteArray()).toEqual(png);

    const withoutImage = await client(admin).catalog.removeProductImage({
      slug: "salsiccia",
      imageId: image?.id ?? "",
    });

    expect(withoutImage.images).toEqual([]);
    await expect(
      s3.send(new HeadObjectCommand({ Bucket: mediaBucket, Key: image?.key })),
    ).rejects.toBeInstanceOf(NotFound);
  });

  it("answers INVALID_IMAGE when the content is not an image", async () => {
    const error = await client(admin)
      .catalog.addProductImage({
        slug: "salsiccia",
        file: new File(["<svg></svg>"], "salsiccia.png", { type: "image/png" }),
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "INVALID_IMAGE", status: 422, defined: true });
  });

  it("rejects files with a type that is not allowed", async () => {
    const error = await client(admin)
      .catalog.addProductImage({
        slug: "salsiccia",
        file: new File([png], "salsiccia.gif", { type: "image/gif" }),
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "BAD_REQUEST", status: 400 });
  });

  it("answers PRODUCT_IMAGE_NOT_FOUND on an unknown image", async () => {
    const error = await client(admin)
      .catalog.removeProductImage({ slug: "salsiccia", imageId: "01JB2Q7Z8X4M3N5P6R7S8T9V96" })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "PRODUCT_IMAGE_NOT_FOUND", status: 404, defined: true });
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
    phone: "+39 333 0000000",
  };
  let mario: { userId: string; role: "customer" };

  beforeAll(async () => {
    const registered = await client().identity.registerUser({
      email: " Mario.Rossi@Example.com ",
      password: "arrosticini-24",
      firstName: "Mario",
      lastName: "Rossi",
      preferredLocale: "it",
    });
    mario = { userId: registered.id, role: "customer" };
  });

  it("registers customers with a normalized email", async () => {
    const registered = await client().identity.registerUser({
      email: "Luigi.Verdi@Example.com",
      password: "arrosticini-24",
      firstName: "Luigi",
      lastName: "Verdi",
      preferredLocale: "en",
    });

    expect(registered).toEqual({
      id: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{26}$/),
      email: "luigi.verdi@example.com",
      role: "customer",
      status: "ACTIVE",
      firstName: "Luigi",
      lastName: "Verdi",
      preferredLocale: "en",
      createdAt: expect.any(String),
    });
  });

  it("requires first and last name", async () => {
    const response = await request(app).post("/identity/users").send({
      email: "anna.bianchi@example.com",
      password: "arrosticini-24",
      preferredLocale: "it",
    });

    expect(response.status).toBe(400);
  });

  it("answers EMAIL_TAKEN on an email already registered", async () => {
    const error = await client()
      .identity.registerUser({
        email: "MARIO.ROSSI@example.com",
        password: "arrosticini-24",
        firstName: "Mario",
        lastName: "Rossi",
        preferredLocale: "it",
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "EMAIL_TAKEN", status: 409, defined: true });
  });

  it("verifies credentials", async () => {
    const verified = await client().identity.verifyCredentials({
      email: "mario.rossi@example.com",
      password: "arrosticini-24",
    });

    expect(verified).toMatchObject({ id: mario.userId, role: "customer", preferredLocale: "it" });
  });

  it("answers INVALID_CREDENTIALS on a wrong password or unknown user", async () => {
    const wrongPassword = await client()
      .identity.verifyCredentials({ email: "mario.rossi@example.com", password: "wrong-password" })
      .catch((caught: unknown) => caught);
    const unknownUser = await client()
      .identity.verifyCredentials({ email: "nobody@example.com", password: "arrosticini-24" })
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
      firstName: "Mariano",
      preferredLocale: "en",
    });

    expect(updated).toMatchObject({
      email: "mario.rossi@example.com",
      firstName: "Mariano",
      lastName: "Rossi",
      preferredLocale: "en",
    });
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
      email: "mario.rossi@example.com",
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
      phone: "+39 333 0000000",
      isDefault: true,
    });

    const { phone: _phone, ...withoutPhone } = address;
    const missingPhone = await request(app)
      .post("/identity/me/addresses")
      .set(ACTOR_HEADER, JSON.stringify(mario))
      .send(withoutPhone);
    expect(missingPhone.status).toBe(400);

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

describe("identity administration", () => {
  let paola: { userId: string; role: "customer" };

  beforeAll(async () => {
    const registered = await client().identity.registerUser({
      email: "paola.marini@example.com",
      password: "arrosticini-24",
      firstName: "Paola",
      lastName: "Marini",
      preferredLocale: "it",
    });
    paola = { userId: registered.id, role: "customer" };
    await client(paola).identity.addAddress({
      fullName: "Paola Marini",
      line1: "Via Asinio Herio 12",
      city: "Chieti",
      postalCode: "66100",
      country: "IT",
      phone: "+39 333 0000004",
    });
  });

  it("is reserved to admins", async () => {
    const anonymous = await client()
      .identity.listUsers()
      .catch((caught: unknown) => caught);
    const forbidden = await client(customer)
      .identity.setUserStatus({ id: paola.userId, status: "SUSPENDED" })
      .catch((caught: unknown) => caught);

    expect(anonymous).toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(forbidden).toMatchObject({ code: "FORBIDDEN", status: 403, defined: true });
  });

  it("lists users and shows one with its addresses", async () => {
    const { items } = await client(admin).identity.listUsers();
    const card = await client(admin).identity.getUser({ id: paola.userId });

    expect(items.map(({ email }) => email)).toEqual(
      expect.arrayContaining(["paola.marini@example.com", "admin@example.com"]),
    );
    expect(card.user).toMatchObject({ id: paola.userId, status: "ACTIVE", firstName: "Paola" });
    expect(card.addresses).toEqual([
      expect.objectContaining({ line1: "Via Asinio Herio 12", isDefault: true }),
    ]);
  });

  it("answers USER_NOT_FOUND on an unknown user", async () => {
    const error = await client(admin)
      .identity.getUser({ id: "01JB2Q7Z8X4M3N5P6R7S8T9V99" })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "USER_NOT_FOUND", status: 404, defined: true });
  });

  it("locks out a suspended user until reactivated", async () => {
    const suspended = await client(admin).identity.setUserStatus({
      id: paola.userId,
      status: "SUSPENDED",
    });
    const session = await client(paola)
      .identity.getMe()
      .catch((caught: unknown) => caught);
    const browsing = await request(app)
      .get("/catalog/products")
      .set(ACTOR_HEADER, JSON.stringify(paola));
    const login = await client()
      .identity.verifyCredentials({ email: "paola.marini@example.com", password: "arrosticini-24" })
      .catch((caught: unknown) => caught);

    expect(suspended.status).toBe("SUSPENDED");
    expect(session).toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(browsing.status).toBe(401);
    expect(login).toMatchObject({ code: "ACCOUNT_SUSPENDED", status: 403, defined: true });

    await client(admin).identity.setUserStatus({ id: paola.userId, status: "ACTIVE" });

    expect((await client(paola).identity.getMe()).status).toBe("ACTIVE");
  });

  it("answers USER_NOT_SUSPENDABLE for an admin", async () => {
    const error = await client(admin)
      .identity.setUserStatus({ id: admin.userId, status: "SUSPENDED" })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "USER_NOT_SUSPENDABLE", status: 409, defined: true });
  });

  it("answers 401 to an actor that does not exist", async () => {
    const response = await request(app)
      .get("/identity/me")
      .set(
        ACTOR_HEADER,
        JSON.stringify({ userId: "01JB2Q7Z8X4M3N5P6R7S8T9V98", role: "customer" }),
      );

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: "UNAUTHORIZED" });
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

  it("forbids admins to take a cart", async () => {
    const { id } = await client().shopping.createCart();

    const error = await client(admin)
      .shopping.mergeCart({ id })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "FORBIDDEN", status: 403, defined: true });
  });
});

describe("ordering", () => {
  const address = {
    fullName: "Anna Bianchi",
    line1: "Corso Marrucino 5",
    city: "Chieti",
    postalCode: "66100",
    country: "IT",
    phone: "+39 333 1111111",
  };
  const lucia = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y", role: "customer" } as const;
  const checkout = { locale: "it", ordersUrl: "http://localhost:3100/it/orders" } as const;
  let anna: { userId: string; role: "customer" };
  let addressId: string;
  let cartId: string;
  let orderId: string;

  beforeAll(async () => {
    const registered = await client().identity.registerUser({
      email: "anna.bianchi@example.com",
      password: "arrosticini-24",
      firstName: "Anna",
      lastName: "Bianchi",
      preferredLocale: "it",
    });
    anna = { userId: registered.id, role: "customer" };
    addressId = (await client(anna).identity.addAddress(address)).id;
    const { id } = await client().shopping.createCart();
    await client().shopping.setCartLine({ id, slug: "vino", quantity: 2 });
    await client().shopping.setCartLine({ id, slug: "fornacella", quantity: 1 });
    cartId = (await client(anna).shopping.mergeCart({ id })).id;
  });

  it("places a pending order priced by the server with a copy of the address", async () => {
    const response = await request(app)
      .post("/ordering/orders")
      .set(ACTOR_HEADER, JSON.stringify(anna))
      .send({ cartId, addressId, ...checkout });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      order: {
        id: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{26}$/),
        userId: anna.userId,
        lines: [
          {
            slug: "vino",
            name: { it: "Prodotto vino", en: "Product vino" },
            unitPriceCents: 500,
            quantity: 2,
          },
          {
            slug: "fornacella",
            name: { it: "Prodotto fornacella", en: "Product fornacella" },
            unitPriceCents: 10000,
            quantity: 1,
          },
        ],
        shippingAddress: address,
        totalCents: 11000,
        currency: "EUR",
        status: "PENDING_PAYMENT",
        createdAt: expect.any(String),
      },
      paymentUrl: expect.stringMatching(/^https:\/\//),
    });
    orderId = response.body.order.id;
  });

  it("shows orders only to their owner", async () => {
    const { items } = await client(anna).ordering.listOrders();
    expect(items.map(({ id }) => id)).toEqual([orderId]);
    expect(await client(anna).ordering.getOrder({ id: orderId })).toEqual(items[0]);

    expect((await client(lucia).ordering.listOrders()).items).toEqual([]);
    const error = await client(lucia)
      .ordering.getOrder({ id: orderId })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: "ORDER_NOT_FOUND", status: 404, defined: true });
  });

  it("lets only admins see every order", async () => {
    const { items } = await client(admin).ordering.listAllOrders({});
    expect(items.map(({ id }) => id)).toContain(orderId);
    expect((await client(admin).ordering.getOrder({ id: orderId })).id).toBe(orderId);
    const own = await client(admin).ordering.listAllOrders({ userId: anna.userId });
    expect(own.items.map(({ id }) => id)).toEqual([orderId]);

    const error = await client(anna)
      .ordering.listAllOrders({})
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: "FORBIDDEN", status: 403, defined: true });
  });

  it("lets admins fix the address of an order not yet shipped", async () => {
    const changed = await client(admin).ordering.changeShippingAddress({
      id: orderId,
      fullName: "Anna Bianchi",
      line1: "Via Arniense 21",
      city: "Chieti",
      postalCode: "66100",
      country: "IT",
      phone: "+39 333 0000005",
    });
    const forbidden = await client(anna)
      .ordering.changeShippingAddress({
        id: orderId,
        fullName: "Anna Bianchi",
        line1: "Via Arniense 21",
        city: "Chieti",
        postalCode: "66100",
        country: "IT",
        phone: "+39 333 0000005",
      })
      .catch((caught: unknown) => caught);

    expect(changed.shippingAddress).toEqual({
      fullName: "Anna Bianchi",
      line1: "Via Arniense 21",
      city: "Chieti",
      postalCode: "66100",
      country: "IT",
      phone: "+39 333 0000005",
    });
    expect(await client(anna).ordering.getOrder({ id: orderId })).toEqual(changed);
    expect(forbidden).toMatchObject({ code: "FORBIDDEN", status: 403, defined: true });
  });

  it("refuses to ship an order that is not paid", async () => {
    const error = await client(admin)
      .ordering.shipOrder({ id: orderId, carrier: "BRT", trackingNumber: "BRT0001" })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "ORDER_INVALID_TRANSITION", status: 409, defined: true });
  });

  it("forbids admins to place orders", async () => {
    const error = await client(admin)
      .ordering.placeOrder({ cartId, addressId, ...checkout })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "FORBIDDEN", status: 403, defined: true });
  });

  it("answers UNAUTHORIZED without an actor", async () => {
    const error = await client()
      .ordering.placeOrder({ cartId, addressId, ...checkout })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "UNAUTHORIZED", status: 401, defined: true });
  });

  it("answers CART_NOT_FOUND on a cart the user does not own", async () => {
    const { id } = await client().shopping.createCart();
    await client().shopping.setCartLine({ id, slug: "vino", quantity: 1 });

    const error = await client(anna)
      .ordering.placeOrder({ cartId: id, addressId, ...checkout })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "CART_NOT_FOUND", status: 404, defined: true });
  });

  it("answers ADDRESS_NOT_FOUND on an address the user does not have", async () => {
    const error = await client(anna)
      .ordering.placeOrder({ cartId, addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V97", ...checkout })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "ADDRESS_NOT_FOUND", status: 404, defined: true });
  });

  it("answers CART_EMPTY on an empty cart", async () => {
    await client().shopping.setCartLine({ id: cartId, slug: "vino", quantity: 0 });
    await client().shopping.setCartLine({ id: cartId, slug: "fornacella", quantity: 0 });

    const error = await client(anna)
      .ordering.placeOrder({ cartId, addressId, ...checkout })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "CART_EMPTY", status: 422, defined: true });
  });

  it("answers PRODUCT_UNAVAILABLE when a product in the cart leaves the catalog", async () => {
    await new DynamoDbProductRepository(dynamo, tables.catalog).create(
      product("birra", 400, "ACTIVE"),
    );
    await client().shopping.setCartLine({ id: cartId, slug: "birra", quantity: 1 });
    await dynamo.send(
      new UpdateCommand({
        TableName: tables.catalog,
        Key: { PK: "PRODUCT#birra", SK: "META" },
        UpdateExpression: "SET #status = :archived",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":archived": "ARCHIVED" },
      }),
    );

    const error = await client(anna)
      .ordering.placeOrder({ cartId, addressId, ...checkout })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "PRODUCT_UNAVAILABLE", status: 422, defined: true });
  });
});

describe("payments", () => {
  const address = {
    fullName: "Marco Neri",
    line1: "Piazza San Giustino 1",
    city: "Chieti",
    postalCode: "66100",
    country: "IT",
    phone: "+39 333 2222222",
  };
  const stranger = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0V", role: "customer" } as const;
  let marco: { userId: string; role: "customer" };
  let addressId: string;

  async function placeOrder() {
    const { id } = await client().shopping.createCart();
    await client().shopping.setCartLine({ id, slug: "vino", quantity: 3 });
    const cartId = (await client(marco).shopping.mergeCart({ id })).id;
    const placed = await client(marco).ordering.placeOrder({
      cartId,
      addressId,
      locale: "en",
      ordersUrl: "http://localhost:3100/en/orders",
    });
    return { cartId, ...placed };
  }

  function webhook(eventId: string, type: string, orderId: string, paymentStatus: string) {
    const payload = JSON.stringify({
      id: eventId,
      object: "event",
      type,
      data: {
        object: {
          id: "cs_test_a1",
          object: "checkout.session",
          mode: "payment",
          payment_status: paymentStatus,
          client_reference_id: orderId,
        },
      },
    });
    return request(app)
      .post("/payments/webhooks/stripe")
      .set("content-type", "application/json")
      .set(
        "stripe-signature",
        stripe.webhooks.generateTestHeaderString({ payload, secret: stripeWebhookSecret }),
      )
      .send(payload);
  }

  beforeAll(async () => {
    const registered = await client().identity.registerUser({
      email: "marco.neri@example.com",
      password: "arrosticini-24",
      firstName: "Marco",
      lastName: "Neri",
      preferredLocale: "en",
    });
    marco = { userId: registered.id, role: "customer" };
    addressId = (await client(marco).identity.addAddress(address)).id;
  });

  it("marks the order as paid and empties the cart when Stripe confirms the payment", async () => {
    const { cartId, order, paymentUrl } = await placeOrder();
    expect(paymentUrl).toMatch(/^https:\/\//);

    const response = await webhook("evt_paid_1", "checkout.session.completed", order.id, "paid");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    const paid = await client(marco).ordering.getOrder({ id: order.id });
    expect(paid).toMatchObject({ status: "PAID", paidAt: expect.any(String) });
    expect((await client().shopping.getCart({ id: cartId })).lines).toEqual([]);

    const repeated = await webhook("evt_paid_1", "checkout.session.completed", order.id, "paid");

    expect(repeated.status).toBe(200);
    expect(await client(marco).ordering.getOrder({ id: order.id })).toEqual(paid);
  });

  it("lets admins ship and close a paid order, ignoring a late payment event", async () => {
    const { order } = await placeOrder();
    await webhook("evt_paid_2", "checkout.session.completed", order.id, "paid");

    const shipped = await client(admin).ordering.shipOrder({ id: order.id, carrier: "BRT" });
    const corrected = await client(admin).ordering.shipOrder({
      id: order.id,
      carrier: "BRT",
      trackingNumber: "BRT0002",
      trackingUrl: "https://vas.brt.it/vas/sped_det_show.hsm?brtCode=BRT0002",
    });
    const late = await webhook("evt_paid_3", "checkout.session.completed", order.id, "paid");
    const locked = await client(admin)
      .ordering.changeShippingAddress({ id: order.id, ...address })
      .catch((caught: unknown) => caught);
    const insecure = await client(admin)
      .ordering.shipOrder({
        id: order.id,
        carrier: "BRT",
        trackingNumber: "BRT0002",
        trackingUrl: "http://vas.brt.it/vas/sped_det_show.hsm?brtCode=BRT0002",
      })
      .catch((caught: unknown) => caught);

    expect(shipped).toMatchObject({ status: "SHIPPED", shipment: { carrier: "BRT" } });
    expect(corrected.shipment).toEqual({
      carrier: "BRT",
      trackingNumber: "BRT0002",
      trackingUrl: "https://vas.brt.it/vas/sped_det_show.hsm?brtCode=BRT0002",
    });
    expect(late.status).toBe(200);
    expect(await client(marco).ordering.getOrder({ id: order.id })).toEqual(corrected);
    expect(locked).toMatchObject({ code: "ORDER_NOT_EDITABLE", status: 409, defined: true });
    expect(insecure).toMatchObject({ code: "BAD_REQUEST", status: 400 });

    const delivered = await client(admin).ordering.closeOrder({
      id: order.id,
      status: "DELIVERED",
    });
    const lost = await client(admin)
      .ordering.closeOrder({ id: order.id, status: "LOST" })
      .catch((caught: unknown) => caught);

    expect(delivered.status).toBe("DELIVERED");
    expect(lost).toMatchObject({ code: "ORDER_INVALID_TRANSITION", status: 409, defined: true });

    const afterDelivery = await client(admin).ordering.shipOrder({
      id: order.id,
      carrier: "BRT",
      trackingNumber: "BRT0003",
    });

    expect(afterDelivery).toMatchObject({
      status: "DELIVERED",
      shipment: { carrier: "BRT", trackingNumber: "BRT0003" },
    });
  });

  it("forbids admins to save cards", async () => {
    const error = await client(admin)
      .payments.createSetupSession({
        returnUrl: "http://localhost:3100/en/account/payment-methods",
        locale: "en",
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "FORBIDDEN", status: 403, defined: true });
  });

  it("cancels the order when the checkout expires", async () => {
    const { order } = await placeOrder();

    const response = await webhook("evt_expired_1", "checkout.session.expired", order.id, "unpaid");

    expect(response.status).toBe(200);
    expect((await client(marco).ordering.getOrder({ id: order.id })).status).toBe("CANCELLED");
  });

  it("rejects webhooks without a valid signature", async () => {
    const forged = await request(app)
      .post("/payments/webhooks/stripe")
      .set("content-type", "application/json")
      .set("stripe-signature", "t=1,v1=forged")
      .send(JSON.stringify({ id: "evt_forged", object: "event", type: "customer.created" }));
    const unsigned = await request(app)
      .post("/payments/webhooks/stripe")
      .set("content-type", "application/json")
      .send("{}");

    for (const response of [forged, unsigned]) {
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: "INVALID_WEBHOOK_SIGNATURE", status: 400 });
    }
  });

  it("lists no saved cards before the first checkout", async () => {
    expect(await client(stranger).payments.listPaymentMethods()).toEqual({ items: [] });
  });

  it("opens a card setup session and lists the saved cards", async () => {
    const response = await request(app)
      .post("/payments/methods/setup-session")
      .set(ACTOR_HEADER, JSON.stringify(marco))
      .send({ returnUrl: "http://localhost:3100/en/account/payment-methods", locale: "en" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ url: expect.stringMatching(/^https:\/\//) });
    const { items } = await client(marco).payments.listPaymentMethods();
    expect(items.length).toBeGreaterThan(0);
  });

  it("answers PAYMENT_METHOD_NOT_FOUND for a card of another customer", async () => {
    const error = await client(marco)
      .payments.deletePaymentMethod({ id: "pm_card_visa" })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "PAYMENT_METHOD_NOT_FOUND", status: 404, defined: true });
  });

  it("answers UNAUTHORIZED without an actor", async () => {
    const error = await client()
      .payments.listPaymentMethods()
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "UNAUTHORIZED", status: 401, defined: true });
  });
});

describe("ops", () => {
  it("describes the task that served the request", async () => {
    expect(await client().ops.whoami()).toEqual({
      service: "api",
      version: "v1.0.0",
      taskId: "4f1c2b9e8d7a4e3f9a1b",
      availabilityZone: "eu-south-1a",
      cpuPercent: 12.5,
      startedAt: "2026-10-09T10:00:00.000Z",
    });
  });
});

describe("unknown paths", () => {
  it("answers 404", async () => {
    const response = await request(app).get("/unknown");

    expect(response.status).toBe(404);
  });
});
