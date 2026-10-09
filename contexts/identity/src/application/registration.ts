import { DomainError, type Locale, newId } from "@arrosticini/kernel";
import type { PasswordHasher } from "../domain/password-hasher.js";
import { User } from "../domain/user.js";
import type { UserRepository } from "../domain/user-repository.js";

export interface RegisterUserCommand {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  preferredLocale: Locale;
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
  email: string;
  password: string;
}

export class VerifyCredentials {
  readonly #users: UserRepository;
  readonly #hasher: PasswordHasher;

  constructor(users: UserRepository, hasher: PasswordHasher) {
    this.#users = users;
    this.#hasher = hasher;
  }

  async execute({ email, password }: Credentials): Promise<User> {
    const user = await this.#users.findByEmail(email);
    if (user === undefined || !(await this.#hasher.verify(password, user.password))) {
      throw new DomainError("INVALID_CREDENTIALS", "Invalid email or password");
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

  async execute({ email, password }: Credentials): Promise<"created" | "exists"> {
    if (await this.#users.findByEmail(email)) {
      return "exists";
    }
    await this.#users.create(
      User.register(
        {
          id: newId(),
          email,
          password: await this.#hasher.hash(password),
          role: "admin",
          firstName: "Admin",
          lastName: "Arrosticini 24ore",
          preferredLocale: "it",
        },
        new Date(),
      ),
    );
    return "created";
  }
}
