export interface Actor {
  userId: string;
  role: "customer" | "admin";
}

export function isAdmin(actor: Actor | undefined): boolean {
  return actor?.role === "admin";
}
