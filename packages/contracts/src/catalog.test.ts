import { describe, expect, it } from "vitest";
import { addProductImage, ProductImageFileName, ProductSlug } from "./catalog.js";

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

describe("ProductImageFileName", () => {
  it.each([
    "0192e1a0-0000-7000-8000-000000000007.webp",
    "0192e1a0-0000-7000-8000-000000000007.png",
    "0192e1a0-0000-7000-8000-000000000007.jpg",
  ])("accepts %s", (fileName) => {
    expect(ProductImageFileName.safeParse(fileName).success).toBe(true);
  });

  it.each([
    "0192e1a0-0000-7000-8000-000000000007.gif",
    "0192e1a0-0000-7000-8000-000000000007",
    "0192e1a0-0000-4000-8000-000000000007.webp",
    "..%2F0192e1a0-0000-7000-8000-000000000007.webp",
    "p_vino.webp",
  ])("rejects %o", (fileName) => {
    expect(ProductImageFileName.safeParse(fileName).success).toBe(false);
  });
});
