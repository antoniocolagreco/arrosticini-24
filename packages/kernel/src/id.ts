import { isValid, ulid } from "ulid";

export type Id = string;

export function newId(): Id {
  return ulid();
}

export function isId(value: unknown): value is Id {
  return typeof value === "string" && isValid(value);
}
