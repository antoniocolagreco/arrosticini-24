import { DomainError } from "@arrosticini/kernel";
import type { User } from "../domain/user.js";
import type { UserRepository } from "../domain/user-repository.js";

export interface Actor {
  userId: string;
  role: "customer" | "admin";
}

export async function loadActingUser(
  users: UserRepository,
  actor: Actor | undefined,
): Promise<User> {
  const user = actor === undefined ? undefined : await users.findById(actor.userId);
  if (user === undefined) {
    throw new DomainError("UNAUTHORIZED", "Authentication required");
  }
  return user;
}

export function requireAdmin(actor: Actor | undefined): void {
  if (actor === undefined) {
    throw new DomainError("UNAUTHORIZED", "Authentication required");
  }
  if (actor.role !== "admin") {
    throw new DomainError("FORBIDDEN", "Only admins can manage users");
  }
}
