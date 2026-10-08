import { DomainError, type Locale, newId } from "@arrosticini/kernel";
import type { PasswordHasher } from "../domain/password-hasher.js";
import { User } from "../domain/user.js";
import type { UserRepository } from "../domain/user-repository.js";

export interface RegisterUserCommand {
  username: string;
  password: string;
  preferredLocale: Locale;
  displayName?: string;
  email?: string;
}

export class RegisterUser {
  readonly #users: UserRepository;
  readonly #hasher: PasswordHasher;

  constructor(users: UserRepository, hasher: PasswordHasher) {
    this.#users = users;
    this.#hasher = hasher;
  }

  async execute({ password, ...profile }: RegisterUserCommand): Promise<User> {
    const user = User.register(
      { ...profile, id: newId(), password: await this.#hasher.hash(password), role: "customer" },
      new Date(),
    );
    await this.#users.create(user);
    return user;
  }
}

export interface Credentials {
  username: string;
  password: string;
}

export class VerifyCredentials {
  readonly #users: UserRepository;
  readonly #hasher: PasswordHasher;

  constructor(users: UserRepository, hasher: PasswordHasher) {
    this.#users = users;
    this.#hasher = hasher;
  }

  async execute({ username, password }: Credentials): Promise<User> {
    const user = await this.#users.findByUsername(username);
    if (user === undefined || !(await this.#hasher.verify(password, user.password))) {
      throw new DomainError("INVALID_CREDENTIALS", "Invalid username or password");
    }
    return user;
  }
}

export class EnsureAdmin {
  readonly #users: UserRepository;
  readonly #hasher: PasswordHasher;

  constructor(users: UserRepository, hasher: PasswordHasher) {
    this.#users = users;
    this.#hasher = hasher;
  }

  async execute({ username, password }: Credentials): Promise<"created" | "exists"> {
    if (await this.#users.findByUsername(username)) {
      return "exists";
    }
    await this.#users.create(
      User.register(
        {
          id: newId(),
          username,
          password: await this.#hasher.hash(password),
          role: "admin",
          preferredLocale: "it",
        },
        new Date(),
      ),
    );
    return "created";
  }
}
