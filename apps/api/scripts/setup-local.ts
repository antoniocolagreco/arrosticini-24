import { readFile } from "node:fs/promises";
import {
  catalogTableDefinition,
  DynamoDbProductRepository,
  Product,
  S3ImageStorage,
} from "@arrosticini/catalog";
import { localizedText, Money, newId } from "@arrosticini/kernel";
import { CreateTableCommand, ResourceInUseException } from "@aws-sdk/client-dynamodb";
import {
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { z } from "zod";
import { createDynamoDbClient } from "../src/aws.js";
import { seedProducts } from "./seed-products.js";

const env = z
  .object({
    AWS_REGION: z.string().min(1),
    DYNAMODB_ENDPOINT: z.url(),
    S3_ENDPOINT: z.url(),
    CATALOG_TABLE: z.string().min(1),
    MEDIA_BUCKET: z.string().min(1),
  })
  .parse(process.env);

const dynamo = createDynamoDbClient(env.AWS_REGION, env.DYNAMODB_ENDPOINT);
const s3 = new S3Client({
  region: env.AWS_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: true,
});

async function createTable(definition: ReturnType<typeof catalogTableDefinition>) {
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

async function createPublicBucket(bucket: string) {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (!(error instanceof BucketAlreadyOwnedByYou)) {
      throw error;
    }
  }
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
  console.log(`bucket ${bucket} ready with public read`);
}

async function seedCatalog() {
  const products = new DynamoDbProductRepository(dynamo, env.CATALOG_TABLE);
  const images = new S3ImageStorage(s3, env.MEDIA_BUCKET);
  for (const seed of seedProducts) {
    if (await products.findBySlug(seed.slug)) {
      console.log(`product ${seed.slug} already exists`);
      continue;
    }
    const imageId = newId();
    const key = `products/${seed.slug}/${imageId}.webp`;
    const body = await readFile(new URL(`../seed/images/${seed.image}`, import.meta.url));
    await images.put(key, body, "image/webp");
    await products.create(
      Product.create(
        {
          slug: seed.slug,
          name: localizedText(seed.name),
          description: localizedText(seed.description),
          ...(seed.pieces === undefined ? {} : { pieces: seed.pieces }),
          price: Money.ofCents(seed.priceCents),
          images: [{ id: imageId, key }],
          status: seed.status,
        },
        new Date(),
      ),
    );
    console.log(`product ${seed.slug} created`);
  }
}

await createTable(catalogTableDefinition(env.CATALOG_TABLE));
await createPublicBucket(env.MEDIA_BUCKET);
await seedCatalog();
