import {
  DynamoDbProductRepository,
  productsTableDefinition,
  S3ImageStorage,
} from "@arrosticini/catalog";
import { Email } from "@arrosticini/contracts";
import {
  DynamoDbUserRepository,
  userEmailsTableDefinition,
  usersTableDefinition,
} from "@arrosticini/identity";
import { ordersTableDefinition } from "@arrosticini/ordering";
import {
  paymentCustomersTableDefinition,
  paymentsTableDefinition,
  stripeEventsTableDefinition,
  stripeEventsTimeToLive,
} from "@arrosticini/payments";
import {
  CreateTableCommand,
  type CreateTableCommandInput,
  DescribeTimeToLiveCommand,
  ResourceInUseException,
  UpdateTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";
import { BucketAlreadyOwnedByYou, CreateBucketCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { createDynamoDbClient, createS3Client } from "../src/aws.js";
import { seedAdmin, seedCatalog } from "./seed.js";

const env = z
  .object({
    AWS_REGION: z.string().min(1),
    DYNAMODB_ENDPOINT: z.url(),
    S3_ENDPOINT: z.url(),
    PRODUCTS_TABLE: z.string().min(1),
    USERS_TABLE: z.string().min(1),
    USER_EMAILS_TABLE: z.string().min(1),
    ORDERS_TABLE: z.string().min(1),
    PAYMENTS_TABLE: z.string().min(1),
    PAYMENT_CUSTOMERS_TABLE: z.string().min(1),
    STRIPE_EVENTS_TABLE: z.string().min(1),
    MEDIA_BUCKET: z.string().min(1),
    ADMIN_EMAIL: Email.optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
  })
  .parse(process.env);

const dynamo = createDynamoDbClient(env.AWS_REGION, env.DYNAMODB_ENDPOINT);
const s3 = createS3Client(env.AWS_REGION, env.S3_ENDPOINT);

async function createTable(definition: CreateTableCommandInput) {
  try {
    await dynamo.send(new CreateTableCommand(definition));
    console.log(`table ${definition.TableName} created`);
  } catch (error) {
    if (!(error instanceof ResourceInUseException)) {
      throw error;
    }
    console.log(`table ${definition.TableName} already exists`);
  }
}

async function createBucket(bucket: string) {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (!(error instanceof BucketAlreadyOwnedByYou)) {
      throw error;
    }
  }
  console.log(`bucket ${bucket} ready`);
}

async function enableStripeEventsTimeToLive(tableName: string) {
  const ttl = await dynamo.send(new DescribeTimeToLiveCommand({ TableName: tableName }));
  if (ttl.TimeToLiveDescription?.TimeToLiveStatus === "DISABLED") {
    await dynamo.send(new UpdateTimeToLiveCommand(stripeEventsTimeToLive(tableName)));
  }
}

await createTable(productsTableDefinition(env.PRODUCTS_TABLE));
await createTable(usersTableDefinition(env.USERS_TABLE));
await createTable(userEmailsTableDefinition(env.USER_EMAILS_TABLE));
await createTable(ordersTableDefinition(env.ORDERS_TABLE));
await createTable(paymentsTableDefinition(env.PAYMENTS_TABLE));
await createTable(paymentCustomersTableDefinition(env.PAYMENT_CUSTOMERS_TABLE));
await createTable(stripeEventsTableDefinition(env.STRIPE_EVENTS_TABLE));
await enableStripeEventsTimeToLive(env.STRIPE_EVENTS_TABLE);
await createBucket(env.MEDIA_BUCKET);
await seedCatalog(
  new DynamoDbProductRepository(dynamo, env.PRODUCTS_TABLE),
  new S3ImageStorage(s3, env.MEDIA_BUCKET),
);
if (env.ADMIN_EMAIL === undefined || env.ADMIN_PASSWORD === undefined) {
  console.log("admin skipped: set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) in .env.local");
} else {
  await seedAdmin(new DynamoDbUserRepository(dynamo, env.USERS_TABLE, env.USER_EMAILS_TABLE), {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });
}
