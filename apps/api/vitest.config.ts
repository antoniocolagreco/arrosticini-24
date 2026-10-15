import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./vitest.global-setup.ts"],
    env: {
      AWS_ACCESS_KEY_ID: "local",
      AWS_SECRET_ACCESS_KEY: "local",
      AWS_REGION: "local",
    },
  },
});
