import { DomainError } from "@arrosticini/kernel";

export interface Actor {
  userId: string;
  role: "customer" | "admin";
}

export function isAdmin(actor: Actor | undefined): boolean {
  return actor?.role === "admin";
}

export function requireAdmin(actor: Actor | undefined): void {
  if (actor === undefined) {
    throw new DomainError("UNAUTHORIZED", "Authentication required");
  }
  if (!isAdmin(actor)) {
    throw new DomainError("FORBIDDEN", "Only admins can manage products");
  }
}
