import type { PageRequest } from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { User, type UserStatus } from "../domain/user.js";
import type { UserRepository } from "../domain/user-repository.js";
import { AuthorizeActor, GetUser, ListUsers, SetUserStatus } from "./administration.js";

const admin = { userId: "0192e1a0-0000-7000-8000-000000000012", role: "admin" } as const;
const customer = { userId: "0192e1a0-0000-7000-8000-000000000013", role: "customer" } as const;

function mario(): User {
  return User.register(
    {
      id: "0192e1a0-0000-7000-8000-000000000013",
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

function repository(
  stored: User,
): UserRepository & { saved: User[]; listed: { status?: UserStatus; page: PageRequest }[] } {
  const saved: User[] = [];
  const listed: { status?: UserStatus; page: PageRequest }[] = [];
  return {
    saved,
    listed,
    findById: async (id) => (id === stored.id ? stored : undefined),
    findByEmail: async () => undefined,
    listAll: async (page) => {
      listed.push({ page });
      return { items: [stored], nextCursor: "next-page" };
    },
    listByStatus: async (status, page) => {
      listed.push({ status, page });
      return { items: [stored] };
    },
    create: async () => {},
    save: async (user) => {
      saved.push(user);
    },
  };
}

describe("user administration", () => {
  it("is reserved to admins", async () => {
    const users = repository(mario());

    await expect(new ListUsers(users).execute(undefined, {})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(new ListUsers(users).execute(customer, {})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      new GetUser(users).execute(customer, "0192e1a0-0000-7000-8000-000000000013"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      new SetUserStatus(users).execute(
        customer,
        "0192e1a0-0000-7000-8000-000000000013",
        "SUSPENDED",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(users.saved).toEqual([]);
  });

  it("lists users and reads one", async () => {
    const stored = mario();
    const users = repository(stored);

    expect(await new ListUsers(users).execute(admin, {})).toEqual({
      items: [stored],
      nextCursor: "next-page",
    });
    expect(await new GetUser(users).execute(admin, "0192e1a0-0000-7000-8000-000000000013")).toBe(
      stored,
    );
    await expect(
      new GetUser(users).execute(admin, "0192e1a0-0000-7000-8000-000000000015"),
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("lists one page of every user or of one status", async () => {
    const users = repository(mario());

    await new ListUsers(users).execute(admin, { cursor: "next-page" });
    await new ListUsers(users).execute(admin, { status: "SUSPENDED" });

    expect(users.listed).toEqual([
      { page: { cursor: "next-page", limit: 20 } },
      { status: "SUSPENDED", page: { cursor: undefined, limit: 20 } },
    ]);
  });

  it("suspends and reactivates a user", async () => {
    const stored = mario();
    const users = repository(stored);
    const setUserStatus = new SetUserStatus(users);

    const suspended = await setUserStatus.execute(
      admin,
      "0192e1a0-0000-7000-8000-000000000013",
      "SUSPENDED",
    );
    expect(suspended.status).toBe("SUSPENDED");
    expect(await new AuthorizeActor(users).execute(customer)).toBe(false);

    const reactivated = await setUserStatus.execute(
      admin,
      "0192e1a0-0000-7000-8000-000000000013",
      "ACTIVE",
    );
    expect(reactivated.status).toBe("ACTIVE");
    expect(await new AuthorizeActor(users).execute(customer)).toBe(true);
    expect(users.saved).toEqual([stored, stored]);
  });

  it("rejects actors that no longer exist", async () => {
    const users = repository(mario());

    expect(
      await new AuthorizeActor(users).execute({
        userId: "0192e1a0-0000-7000-8000-000000000015",
        role: "customer",
      }),
    ).toBe(false);
  });
});
