import { randomUUID } from "node:crypto";
import { S3_TEST_CREDENTIALS } from "@arrosticini/testing";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  S3Client,
} from "@aws-sdk/client-s3";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { S3ImageStorage } from "./s3-image-storage.js";

const bucket = `media-test-${randomUUID()}`;
const client = new S3Client({
  endpoint: inject("s3Endpoint"),
  region: "local",
  forcePathStyle: true,
  credentials: S3_TEST_CREDENTIALS,
});
const storage = new S3ImageStorage(client, bucket);

beforeAll(async () => {
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
});

describe("S3ImageStorage", () => {
  it("stores an image with its content type and deletes it", async () => {
    const body = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    await storage.put("products/vino/0192e1a0-0000-7000-8000-000000000007.png", body, "image/png");

    const stored = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: "products/vino/0192e1a0-0000-7000-8000-000000000007.png",
      }),
    );
    expect(stored.ContentType).toBe("image/png");
    expect(await stored.Body?.transformToByteArray()).toEqual(body);

    await storage.delete("products/vino/0192e1a0-0000-7000-8000-000000000007.png");

    await expect(
      client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: "products/vino/0192e1a0-0000-7000-8000-000000000007.png",
        }),
      ),
    ).rejects.toBeInstanceOf(NotFound);
  });

  it("reads a stored image with its content type", async () => {
    const body = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45]);
    await storage.put(
      "products/vino/0192e1a0-0000-7000-8000-000000000008.webp",
      body,
      "image/webp",
    );

    const image = await storage.get("products/vino/0192e1a0-0000-7000-8000-000000000008.webp");

    expect(image).toEqual({ body, contentType: "image/webp" });
  });

  it("returns nothing for a missing image", async () => {
    expect(
      await storage.get("products/vino/0192e1a0-0000-7000-8000-000000000009.webp"),
    ).toBeUndefined();
  });
});
