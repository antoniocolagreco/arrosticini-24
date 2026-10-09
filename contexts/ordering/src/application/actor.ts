import { DomainError } from "@arrosticini/kernel";

export interface Actor {
  userId: string;
  role: "customer" | "admin";
}

export function requireActor(actor: Actor | undefined): Actor {
  if (actor === undefined) {
    throw new DomainError("UNAUTHORIZED", "Authentication required");
  }
  return actor;
}

export function requireAdmin(actor: Actor | undefined, action: string): void {
  if (requireActor(actor).role !== "admin") {
    throw new DomainError("FORBIDDEN", `Only admins can ${action}`);
  }
}
