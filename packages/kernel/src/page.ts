import { DomainError } from "./domain-error.js";

export const PAGE_SIZE = 20;

export interface PageRequest {
  cursor?: string | undefined;
  limit: number;
}

export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

export type CursorKey = Record<string, string | number>;

export function encodeCursor(key: CursorKey): string {
  return Buffer.from(JSON.stringify(key)).toString("base64url");
}

export function decodeCursor(cursor: string, attributes: readonly string[]): CursorKey {
  let key: unknown;
  try {
    key = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new DomainError("INVALID_CURSOR", "Invalid cursor");
  }
  const valid =
    typeof key === "object" &&
    key !== null &&
    Object.keys(key).length === attributes.length &&
    attributes.every((attribute) => {
      const value: unknown = (key as Record<string, unknown>)[attribute];
      return typeof value === "string" || typeof value === "number";
    });
  if (!valid) {
    throw new DomainError("INVALID_CURSOR", "Invalid cursor");
  }
  return key as CursorKey;
}
