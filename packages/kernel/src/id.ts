import { randomUUIDv7 } from "node:crypto";

export type Id = string;

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function newId(): Id {
  return randomUUIDv7();
}

export function isId(value: unknown): value is Id {
  return typeof value === "string" && UUID_V7.test(value);
}
