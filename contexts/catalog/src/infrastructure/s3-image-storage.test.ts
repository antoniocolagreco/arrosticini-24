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

    await storage.put("products/vino/01JB2Q7Z8X4M3N5P6R7S8T9V0A.png", body, "image/png");

    const stored = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: "products/vino/01JB2Q7Z8X4M3N5P6R7S8T9V0A.png" }),
    );
    expect(stored.ContentType).toBe("image/png");
    expect(await stored.Body?.transformToByteArray()).toEqual(body);

    await storage.delete("products/vino/01JB2Q7Z8X4M3N5P6R7S8T9V0A.png");

    await expect(
      client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: "products/vino/01JB2Q7Z8X4M3N5P6R7S8T9V0A.png",
        }),
      ),
    ).rejects.toBeInstanceOf(NotFound);
  });
});
