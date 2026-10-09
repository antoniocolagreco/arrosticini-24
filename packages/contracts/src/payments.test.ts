import { describe, expect, it } from "vitest";
import { createSetupSession } from "./payments.js";

describe("createSetupSession input", () => {
  const input = createSetupSession["~orpc"].inputSchema;

  it("accepts an absolute return URL and a supported locale", async () => {
    const result = await input?.["~standard"].validate({
      returnUrl: "http://localhost:3100/it/account/payment-methods",
      locale: "it",
    });

    expect(result).not.toHaveProperty("issues");
  });

  it.each([
    { returnUrl: "/it/account/payment-methods", locale: "it" },
    { returnUrl: "http://localhost:3100/de/account/payment-methods", locale: "de" },
  ])("rejects %o", async (value) => {
    const result = await input?.["~standard"].validate(value);

    expect(result).toHaveProperty("issues");
  });
});
