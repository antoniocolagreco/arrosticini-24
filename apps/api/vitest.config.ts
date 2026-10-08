import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      AWS_ACCESS_KEY_ID: "local",
      AWS_SECRET_ACCESS_KEY: "local",
      AWS_REGION: "local",
    },
  },
});
