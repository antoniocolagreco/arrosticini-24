import { describe, expect, it } from "vitest";
import { isId, newId } from "./id.js";

describe("id", () => {
  it("generates a valid UUIDv7", () => {
    expect(isId(newId())).toBe(true);
  });

  it.each([
    "",
    "not-an-id",
    42,
    "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
    "9b2c4f1e-3d5a-4b6c-8d7e-1f2a3b4c5d6e",
  ])("rejects %o", (value) => {
    expect(isId(value)).toBe(false);
  });
});
