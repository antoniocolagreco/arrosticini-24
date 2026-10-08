import { describe, expect, it } from "vitest";
import { setCartLine } from "./shopping.js";

describe("setCartLine input", () => {
  const input = setCartLine["~orpc"].inputSchema;

  it.each([0, 1, 99])("accepts quantity %i", async (quantity) => {
    const result = await input?.["~standard"].validate({
      id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
      slug: "vino",
      quantity,
    });

    expect(result).not.toHaveProperty("issues");
  });

  it.each([-1, 100, 1.5])("rejects quantity %o", async (quantity) => {
    const result = await input?.["~standard"].validate({
      id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
      slug: "vino",
      quantity,
    });

    expect(result).toHaveProperty("issues");
  });
});
