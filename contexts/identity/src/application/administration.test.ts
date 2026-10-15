import { describe, expect, it } from "vitest";
import { User } from "../domain/user.js";
import type { UserRepository } from "../domain/user-repository.js";
import { AuthorizeActor, GetUser, ListUsers, SetUserStatus } from "./administration.js";

const admin = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0W", role: "admin" } as const;
const customer = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X", role: "customer" } as const;

function mario(): User {
  return User.register(
    {
      id: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
      email: "mario.rossi@example.com",
      password: { hash: "bWFyaW8=", salt: "c2FsZS1tYXJpbw==" },
      role: "customer",
      firstName: "Mario",
      lastName: "Rossi",
      preferredLocale: "it",
    },
    new Date("2026-10-08T10:00:00.000Z"),
  );
}

function repository(stored: User): UserRepository & { saved: User[] } {
  const saved: User[] = [];
  return {
    saved,
    findById: async (id) => (id === stored.id ? stored : undefined),
    findByEmail: async () => undefined,
    listAll: async () => [stored],
    create: async () => {},
    save: async (user) => {
      saved.push(user);
    },
  };
}

describe("user administration", () => {
  it("is reserved to admins", async () => {
    const users = repository(mario());

    await expect(new ListUsers(users).execute(undefined)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(new ListUsers(users).execute(customer)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      new GetUser(users).execute(customer, "01JB2Q7Z8X4M3N5P6R7S8T9V0X"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      new SetUserStatus(users).execute(customer, "01JB2Q7Z8X4M3N5P6R7S8T9V0X", "SUSPENDED"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(users.saved).toEqual([]);
  });

  it("lists users and reads one", async () => {
    const stored = mario();
    const users = repository(stored);

    expect(await new ListUsers(users).execute(admin)).toEqual([stored]);
    expect(await new GetUser(users).execute(admin, "01JB2Q7Z8X4M3N5P6R7S8T9V0X")).toBe(stored);
    await expect(
      new GetUser(users).execute(admin, "01JB2Q7Z8X4M3N5P6R7S8T9V0Z"),
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("suspends and reactivates a user", async () => {
    const stored = mario();
    const users = repository(stored);
    const setUserStatus = new SetUserStatus(users);

    const suspended = await setUserStatus.execute(admin, "01JB2Q7Z8X4M3N5P6R7S8T9V0X", "SUSPENDED");
    expect(suspended.status).toBe("SUSPENDED");
    expect(await new AuthorizeActor(users).execute(customer)).toBe(false);

    const reactivated = await setUserStatus.execute(admin, "01JB2Q7Z8X4M3N5P6R7S8T9V0X", "ACTIVE");
    expect(reactivated.status).toBe("ACTIVE");
    expect(await new AuthorizeActor(users).execute(customer)).toBe(true);
    expect(users.saved).toEqual([stored, stored]);
  });

  it("rejects actors that no longer exist", async () => {
    const users = repository(mario());

    expect(
      await new AuthorizeActor(users).execute({
        userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Z",
        role: "customer",
      }),
    ).toBe(false);
  });
});
