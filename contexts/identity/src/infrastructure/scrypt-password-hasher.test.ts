import { describe, expect, it } from "vitest";
import { ScryptPasswordHasher } from "./scrypt-password-hasher.js";

const hasher = new ScryptPasswordHasher();

describe("ScryptPasswordHasher", () => {
  it("verifies the right password", async () => {
    const stored = await hasher.hash("arrosticini-24");

    expect(await hasher.verify("arrosticini-24", stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hasher.hash("arrosticini-24");

    expect(await hasher.verify("arrosticini-25", stored)).toBe(false);
  });

  it("uses a different salt for each hash", async () => {
    const first = await hasher.hash("arrosticini-24");
    const second = await hasher.hash("arrosticini-24");

    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });
});
