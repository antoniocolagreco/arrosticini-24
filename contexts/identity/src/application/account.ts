import { DomainError } from "@arrosticini/kernel";
import type { PasswordHasher } from "../domain/password-hasher.js";
import type { ProfileChanges, User } from "../domain/user.js";
import type { UserRepository } from "../domain/user-repository.js";
import { type Actor, loadActingUser } from "./actor.js";

export class GetMe {
  readonly #users: UserRepository;

  constructor(users: UserRepository) {
    this.#users = users;
  }

  execute(actor: Actor | undefined): Promise<User> {
    return loadActingUser(this.#users, actor);
  }
}

export class UpdateMe {
  readonly #users: UserRepository;

  constructor(users: UserRepository) {
    this.#users = users;
  }

  async execute(actor: Actor | undefined, changes: ProfileChanges): Promise<User> {
    const user = await loadActingUser(this.#users, actor);
    user.updateProfile(changes);
    await this.#users.save(user);
    return user;
  }
}

export interface ChangePasswordCommand {
  currentPassword: string;
  newPassword: string;
}

export class ChangePassword {
  readonly #users: UserRepository;
  readonly #hasher: PasswordHasher;

  constructor(users: UserRepository, hasher: PasswordHasher) {
    this.#users = users;
    this.#hasher = hasher;
  }

  async execute(
    actor: Actor | undefined,
    { currentPassword, newPassword }: ChangePasswordCommand,
  ): Promise<void> {
    const user = await loadActingUser(this.#users, actor);
    if (!(await this.#hasher.verify(currentPassword, user.password))) {
      throw new DomainError("INVALID_CURRENT_PASSWORD", "Current password is wrong");
    }
    user.changePassword(await this.#hasher.hash(newPassword));
    await this.#users.save(user);
  }
}
