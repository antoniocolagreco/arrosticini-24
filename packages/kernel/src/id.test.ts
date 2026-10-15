import { describe, expect, it } from "vitest";
import { isId, newId } from "./id.js";

describe("id", () => {
  it("generates a valid ULID", () => {
    expect(isId(newId())).toBe(true);
  });

  it.each(["", "not-an-id", 42])("rejects %o", (value) => {
    expect(isId(value)).toBe(false);
  });
});
