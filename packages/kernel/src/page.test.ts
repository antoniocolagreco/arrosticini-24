import { describe, expect, it } from "vitest";
import { DomainError } from "./domain-error.js";
import { decodeCursor, encodeCursor } from "./page.js";

describe("cursor", () => {
  it("decodes the key it encoded", () => {
    const key = { orderId: "019a2b3c-4d5e-7f60-8a1b-2c3d4e5f6a7b", priceCents: 500 };

    expect(decodeCursor(encodeCursor(key), ["orderId", "priceCents"])).toEqual(key);
  });

  it.each([
    ["not base64 json", "%%%"],
    ["a missing attribute", encodeCursor({ orderId: "a" })],
    ["an extra attribute", encodeCursor({ orderId: "a", priceCents: 1, userId: "b" })],
    ["a wrong attribute", encodeCursor({ orderId: "a", userId: "b" })],
    ["a non scalar value", Buffer.from('{"orderId":"a","priceCents":{}}').toString("base64url")],
    ["a non object", Buffer.from("[1,2]").toString("base64url")],
  ])("rejects %s", (_, cursor) => {
    expect(() => decodeCursor(cursor, ["orderId", "priceCents"])).toThrow(
      new DomainError("INVALID_CURSOR", "Invalid cursor"),
    );
  });
});
