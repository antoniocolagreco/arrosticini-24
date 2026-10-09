import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer, type Server } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { catalogTableDefinition, DynamoDbProductRepository, Product } from "@arrosticini/catalog";
import {
  DynamoDbUserRepository,
  identityTableDefinition,
  ScryptPasswordHasher,
  User,
} from "@arrosticini/identity";
import { Money, newId } from "@arrosticini/kernel";
import { orderingTableDefinition } from "@arrosticini/ordering";
import { paymentsTableDefinition } from "@arrosticini/payments";
import {
  CreateTableCommand,
  type CreateTableCommandInput,
  DeleteTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, paginateScan } from "@aws-sdk/lib-dynamodb";
import { Valkey } from "iovalkey";
import { createCookie } from "react-router";
import Stripe from "stripe";

const root: string = fileURLToPath(new URL("../../", import.meta.url));

async function freePort(): Promise<number> {
  const server: Server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address: ReturnType<Server["address"]> = server.address();
  if (!address || typeof address === "string") throw new Error("No TCP port allocated");
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

async function startProcess(
  args: string[],
  env: NodeJS.ProcessEnv,
  port: number,
): Promise<ChildProcess> {
  const child: ChildProcess = spawn(process.execPath, args, { cwd: root, env, stdio: "ignore" });
  try {
    for (let attempt: number = 0; attempt < 150; attempt++) {
      if (child.exitCode !== null)
        throw new Error(`E2E service exited with code ${child.exitCode}`);
      try {
        const health: Response = await fetch(`http://127.0.0.1:${port}/healthz`, {
          signal: AbortSignal.timeout(500),
        });
        if (health.ok) return child;
      } catch {}
      await delay(100);
    }
    throw new Error(`E2E service on port ${port} did not become healthy. Build api and web first.`);
  } catch (error: unknown) {
    await stopProcess(child);
    throw error;
  }
}

async function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited: Promise<unknown[]> = once(child, "exit");
  child.kill("SIGTERM");
  const timer: ReturnType<typeof setTimeout> = setTimeout(() => child.kill("SIGKILL"), 5000);
  try {
    await exited;
  } finally {
    clearTimeout(timer);
  }
}

export interface TestStack {
  origin: string;
  admin: { email: string; password: string };
  cookie: ReturnType<typeof createCookie>;
  sessionIds: Set<string>;
  stripe: Stripe | undefined;
  webhookSecret: string;
  deliverPaidEvent: (sessionId: string) => Promise<void>;
}

export async function withStack(
  use: (stack: TestStack) => Promise<void>,
  workerIndex: string,
): Promise<void> {
  const suffix: string = `${workerIndex}-${randomUUID()}`;
  const tables: { catalog: string; identity: string; ordering: string; payments: string } = {
    catalog: `catalog-e2e-${suffix}`,
    identity: `identity-e2e-${suffix}`,
    ordering: `ordering-e2e-${suffix}`,
    payments: `payments-e2e-${suffix}`,
  };
  const bucket: string = `e2e-${suffix}`;
  const secret: string = randomUUID();
  const webhookSecret: string = `whsec_${randomUUID()}`;
  const stripeKey: string | undefined = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && !stripeKey.startsWith("sk_test_"))
    throw new Error("E2E requires a Stripe test-mode secret key");
  const stripe: Stripe | undefined = stripeKey ? new Stripe(stripeKey) : undefined;
  const credentials: { accessKeyId: string; secretAccessKey: string } = {
    accessKeyId: "rustfsadmin",
    secretAccessKey: "rustfsadmin",
  };
  const dynamo: DynamoDBClient = new DynamoDBClient({
    region: "local",
    endpoint: process.env.E2E_DYNAMODB_ENDPOINT ?? "http://localhost:8000",
    credentials,
  });
  const document: DynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamo);
  const s3Endpoint: string = process.env.E2E_S3_ENDPOINT ?? "http://localhost:9100";
  const s3: S3Client = new S3Client({
    region: "local",
    endpoint: s3Endpoint,
    forcePathStyle: true,
    credentials,
  });
  const valkeyUrl: string = process.env.E2E_VALKEY_URL ?? "redis://localhost:6379";
  const valkey: Valkey = new Valkey(valkeyUrl, { lazyConnect: true });
  const createdTables: string[] = [];
  const children: ChildProcess[] = [];
  const sessionIds: Set<string> = new Set();
  let bucketCreated: boolean = false;
  try {
    await valkey.connect();
    for (const definition of [
      catalogTableDefinition(tables.catalog),
      identityTableDefinition(tables.identity),
      orderingTableDefinition(tables.ordering),
      paymentsTableDefinition(tables.payments),
    ] satisfies CreateTableCommandInput[]) {
      await dynamo.send(new CreateTableCommand(definition));
      if (definition.TableName) createdTables.push(definition.TableName);
    }
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    bucketCreated = true;
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        }),
      }),
    );
    const products: DynamoDbProductRepository = new DynamoDbProductRepository(
      document,
      tables.catalog,
    );
    await products.create(
      Product.create(
        {
          slug: "e2e-arrosticini",
          name: { it: "Arrosticini di prova", en: "Test arrosticini" },
          description: {
            it: "Arrosticini per il percorso di acquisto.",
            en: "Arrosticini for the purchase journey.",
          },
          price: Money.ofCents(3750),
          pieces: 75,
          images: [],
          status: "ACTIVE",
        },
        new Date(),
      ),
    );
    const admin: { email: string; password: string } = {
      email: `admin-${suffix}@example.com`,
      password: randomUUID(),
    };
    const users: DynamoDbUserRepository = new DynamoDbUserRepository(document, tables.identity);
    await users.create(
      User.register(
        {
          id: newId(),
          email: admin.email,
          password: await new ScryptPasswordHasher().hash(admin.password),
          role: "admin",
          firstName: "Test",
          lastName: "Admin",
          preferredLocale: "it",
        },
        new Date(),
      ),
    );
    const apiPort: number = await freePort();
    const webPort: number = await freePort();
    const origin: string = `http://localhost:${webPort}`;
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: "production",
      LOG_LEVEL: "fatal",
      AWS_REGION: "local",
      AWS_ACCESS_KEY_ID: credentials.accessKeyId,
      AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
      DYNAMODB_ENDPOINT: process.env.E2E_DYNAMODB_ENDPOINT ?? "http://localhost:8000",
      S3_ENDPOINT: s3Endpoint,
      MEDIA_BUCKET: bucket,
      CATALOG_TABLE: tables.catalog,
      IDENTITY_TABLE: tables.identity,
      ORDERING_TABLE: tables.ordering,
      PAYMENTS_TABLE: tables.payments,
      VALKEY_URL: valkeyUrl,
      STRIPE_SECRET_KEY: stripeKey ?? "sk_test_e2e_unconfigured",
      STRIPE_WEBHOOK_SECRET: webhookSecret,
      API_PORT: String(apiPort),
      API_URL: `http://127.0.0.1:${apiPort}`,
      WEB_PORT: String(webPort),
      PUBLIC_ORIGIN: origin,
      SESSION_SECRET: secret,
      MEDIA_BASE_URL: `${s3Endpoint}/${bucket}`,
    };
    children.push(await startProcess(["apps/api/dist/server.js"], env, apiPort));
    children.push(
      await startProcess(
        ["--import", import.meta.resolve("tsx"), "apps/web/server.ts"],
        env,
        webPort,
      ),
    );
    const stack: TestStack = {
      origin,
      admin,
      cookie: createCookie("__session", { secrets: [secret] }),
      sessionIds,
      stripe,
      webhookSecret,
      deliverPaidEvent: async (sessionId: string): Promise<void> => {
        if (!stripe) throw new Error("STRIPE_SECRET_KEY is required for the hosted payment test");
        const session: Stripe.Checkout.Session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== "paid")
          throw new Error("Stripe has not confirmed this test payment");
        const events: Stripe.ApiList<Stripe.Event> = await stripe.events.list({
          type: "checkout.session.completed",
          limit: 100,
        });
        const event: Stripe.Event | undefined = events.data.find(
          (candidate) =>
            candidate.type === "checkout.session.completed" &&
            candidate.data.object.id === sessionId,
        );
        if (!event) throw new Error("Stripe completion event is not available yet");
        const payload: string = JSON.stringify(event);
        const response: Response = await fetch(`${origin}/webhooks/stripe`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "stripe-signature": stripe.webhooks.generateTestHeaderString({
              payload,
              secret: webhookSecret,
            }),
          },
          body: payload,
        });
        if (!response.ok) throw new Error(`Webhook delivery failed with ${response.status}`);
      },
    };
    await use(stack);
  } finally {
    for (const child of children.reverse()) await stopProcess(child);
    const keys: Set<string> = new Set();
    for (const id of sessionIds) {
      const stored: string | null = await valkey.get(`sess:${id}`);
      if (stored) {
        const value: { cartId?: string; userId?: string } = JSON.parse(stored);
        if (value.cartId) keys.add(`cart:${value.cartId}`);
        if (value.userId) keys.add(`cart-owner:${value.userId}`);
      }
      keys.add(`sess:${id}`);
    }
    if (createdTables.includes(tables.identity)) {
      for await (const page of paginateScan({ client: document }, { TableName: tables.identity })) {
        for (const item of page.Items ?? []) {
          if (item.SK === "PROFILE" && typeof item.id === "string") {
            const cartId: string | null = await valkey.get(`cart-owner:${item.id}`);
            if (cartId) keys.add(`cart:${cartId}`);
            keys.add(`cart-owner:${item.id}`);
          }
        }
      }
    }
    if (keys.size) await valkey.del(...keys);
    if (stripe && createdTables.includes(tables.payments)) {
      for await (const page of paginateScan({ client: document }, { TableName: tables.payments })) {
        for (const item of page.Items ?? [])
          if (typeof item.stripeCustomerId === "string")
            await stripe.customers.del(item.stripeCustomerId);
      }
    }
    for (const TableName of createdTables) await dynamo.send(new DeleteTableCommand({ TableName }));
    if (bucketCreated) {
      let continuation: string | undefined;
      do {
        const objects = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            ...(continuation ? { ContinuationToken: continuation } : {}),
          }),
        );
        for (const object of objects.Contents ?? [])
          if (object.Key)
            await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key }));
        continuation = objects.NextContinuationToken;
      } while (continuation);
      await s3.send(new DeleteBucketCommand({ Bucket: bucket }));
    }
    valkey.disconnect();
    dynamo.destroy();
    s3.destroy();
  }
}
