import { DomainError, type Id } from "@arrosticini/kernel";
import type { User, UserStatus } from "../domain/user.js";
import type { UserRepository } from "../domain/user-repository.js";
import { type Actor, requireAdmin } from "./actor.js";

async function findUser(users: UserRepository, id: Id): Promise<User> {
  const user = await users.findById(id);
  if (user === undefined) {
    throw new DomainError("USER_NOT_FOUND", `User not found: ${id}`);
  }
  return user;
}

export class ListUsers {
  readonly #users: UserRepository;

  constructor(users: UserRepository) {
    this.#users = users;
  }

  async execute(actor: Actor | undefined): Promise<User[]> {
    requireAdmin(actor);
    return this.#users.listAll();
  }
}

export class GetUser {
  readonly #users: UserRepository;

  constructor(users: UserRepository) {
    this.#users = users;
  }

  async execute(actor: Actor | undefined, id: Id): Promise<User> {
    requireAdmin(actor);
    return findUser(this.#users, id);
  }
}

export class SetUserStatus {
  readonly #users: UserRepository;

  constructor(users: UserRepository) {
    this.#users = users;
  }

  async execute(actor: Actor | undefined, id: Id, status: UserStatus): Promise<User> {
    requireAdmin(actor);
    const user = await findUser(this.#users, id);
    if (status === "SUSPENDED") {
      user.suspend();
    } else {
      user.reactivate();
    }
    await this.#users.save(user);
    return user;
  }
}

export class AuthorizeActor {
  readonly #users: UserRepository;

  constructor(users: UserRepository) {
    this.#users = users;
  }

  async execute(actor: Actor): Promise<boolean> {
    return (await this.#users.findById(actor.userId))?.status === "ACTIVE";
  }
}
