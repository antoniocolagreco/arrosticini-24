import { describe, expect, it } from "vitest";
import { setCartLine } from "./shopping.js";

describe("setCartLine input", () => {
  const input = setCartLine["~orpc"].inputSchema;

  it.each([0, 1, 99])("accepts quantity %i", async (quantity) => {
    const result = await input?.["~standard"].validate({
      id: "0192e1a0-0000-7000-8000-000000000012",
      slug: "vino",
      quantity,
    });

    expect(result).not.toHaveProperty("issues");
  });

  it.each([-1, 100, 1.5])("rejects quantity %o", async (quantity) => {
    const result = await input?.["~standard"].validate({
      id: "0192e1a0-0000-7000-8000-000000000012",
      slug: "vino",
      quantity,
    });

    expect(result).toHaveProperty("issues");
  });
});
