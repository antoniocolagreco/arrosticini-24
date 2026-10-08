import { describe, expect, it } from "vitest";
import { addProductImage, ProductSlug } from "./catalog.js";

describe("ProductSlug", () => {
  it.each(["arrosticini-75", "vino", "pecora-diy"])("accepts %s", (slug) => {
    expect(ProductSlug.safeParse(slug).success).toBe(true);
  });

  it.each(["Arrosticini", "pecora_diy", "-vino", "vino-", "carbone--bio", ""])(
    "rejects %o",
    (slug) => {
      expect(ProductSlug.safeParse(slug).success).toBe(false);
    },
  );
});

describe("addProductImage input", () => {
  const input = addProductImage["~orpc"].inputSchema;

  it("accepts a webp image up to 5 MB", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024)], "p_vino.webp", {
      type: "image/webp",
    });

    const result = await input?.["~standard"].validate({ slug: "vino", file });

    expect(result).not.toHaveProperty("issues");
  });

  it("rejects an image over 5 MB", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "p_vino.webp", {
      type: "image/webp",
    });

    const result = await input?.["~standard"].validate({ slug: "vino", file });

    expect(result).toHaveProperty("issues");
  });

  it("rejects a file that is not jpeg, png or webp", async () => {
    const file = new File(["GIF89a"], "p_vino.gif", { type: "image/gif" });

    const result = await input?.["~standard"].validate({ slug: "vino", file });

    expect(result).toHaveProperty("issues");
  });
});
