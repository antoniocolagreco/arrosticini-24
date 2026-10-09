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
