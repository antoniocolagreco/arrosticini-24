import { describe, expect, it } from "vitest";
import type { PasswordHash, PasswordHasher } from "../domain/password-hasher.js";
import { User } from "../domain/user.js";
import type { UserRepository } from "../domain/user-repository.js";
import { VerifyCredentials } from "./registration.js";

const mario = User.register(
  {
    id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
    email: "mario.rossi@example.com",
    password: { hash: "bWFyaW8=", salt: "c2FsZS1tYXJpbw==" },
    role: "customer",
    firstName: "Mario",
    lastName: "Rossi",
    preferredLocale: "it",
  },
  new Date("2026-10-08T10:00:00.000Z"),
);

const users: UserRepository = {
  findById: async (id) => (id === mario.id ? mario : undefined),
  findByEmail: async (email) => (email === mario.email ? mario : undefined),
  create: async () => {},
  save: async () => {},
};

class RecordingHasher implements PasswordHasher {
  readonly verified: PasswordHash[] = [];

  async hash(): Promise<PasswordHash> {
    return { hash: "ZXNjYQ==", salt: "c2FsZS1lc2Nh" };
  }

  async verify(_password: string, stored: PasswordHash): Promise<boolean> {
    this.verified.push(stored);
    return false;
  }
}

describe("VerifyCredentials", () => {
  it("checks the password against a decoy hash when the email is unknown", async () => {
    const hasher = new RecordingHasher();

    const error = await new VerifyCredentials(users, hasher)
      .execute({ email: "nessuno@example.com", password: "arrosticini-24" })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(hasher.verified).toEqual([{ hash: "ZXNjYQ==", salt: "c2FsZS1lc2Nh" }]);
  });

  it("checks the password against the stored hash when the email exists", async () => {
    const hasher = new RecordingHasher();

    const error = await new VerifyCredentials(users, hasher)
      .execute({ email: "mario.rossi@example.com", password: "sbagliata" })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(hasher.verified).toEqual([{ hash: "bWFyaW8=", salt: "c2FsZS1tYXJpbw==" }]);
  });
});
