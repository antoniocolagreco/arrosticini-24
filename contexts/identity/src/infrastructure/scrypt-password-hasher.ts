import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PasswordHash, PasswordHasher } from "../domain/password-hasher.js";

const derive = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<PasswordHash> {
    const salt = randomBytes(16);
    const key = await derive(password, salt, KEY_LENGTH);
    return { hash: key.toString("base64"), salt: salt.toString("base64") };
  }

  async verify(password: string, stored: PasswordHash): Promise<boolean> {
    const expected = Buffer.from(stored.hash, "base64");
    const key = await derive(password, Buffer.from(stored.salt, "base64"), expected.length);
    return timingSafeEqual(key, expected);
  }
}
