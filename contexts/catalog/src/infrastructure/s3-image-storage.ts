import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import type { ImageStorage, StoredImage } from "../application/image-storage.js";

export class S3ImageStorage implements ImageStorage {
  readonly #client: S3Client;
  readonly #bucket: string;

  constructor(client: S3Client, bucket: string) {
    this.#client = client;
    this.#bucket = bucket;
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.#client.send(
      new PutObjectCommand({
        Bucket: this.#bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<StoredImage | undefined> {
    try {
      const { Body, ContentType } = await this.#client.send(
        new GetObjectCommand({ Bucket: this.#bucket, Key: key }),
      );
      if (Body === undefined || ContentType === undefined) {
        return undefined;
      }
      return { body: await Body.transformToByteArray(), contentType: ContentType };
    } catch (error: unknown) {
      if (error instanceof NoSuchKey) {
        return undefined;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.#client.send(new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }));
  }
}
