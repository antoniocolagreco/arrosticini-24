import { test as base } from "@playwright/test";
import { type TestStack, withStack } from "./stack.js";

export const test = base.extend<{ sessionTracking: undefined }, { stack: TestStack }>({
  stack: [
    async ({ browserName }, use, workerInfo) => {
      await withStack(use, `${browserName}-${workerInfo.workerIndex}`);
    },
    { scope: "worker", timeout: 60000 },
  ],
  baseURL: async ({ stack }, use) => {
    await use(stack.origin);
  },
  sessionTracking: [
    async ({ context, stack }, use) => {
      const captured: Promise<void>[] = [];
      context.on("response", (response) => {
        if (!response.url().startsWith(`${stack.origin}/`)) return;
        captured.push(
          (async () => {
            for (const header of await response.headersArray()) {
              if (
                header.name.toLowerCase() !== "set-cookie" ||
                !header.value.startsWith("__session=")
              )
                continue;
              const id: unknown = await stack.cookie.parse(header.value.split(";")[0] ?? "");
              if (typeof id === "string" && /^[a-f0-9]{64}$/.test(id)) stack.sessionIds.add(id);
            }
          })(),
        );
      });
      try {
        await use(undefined);
      } finally {
        for (const cookie of await context.cookies(stack.origin)) {
          if (cookie.name !== "__session") continue;
          const id: unknown = await stack.cookie.parse(`${cookie.name}=${cookie.value}`);
          if (typeof id === "string" && /^[a-f0-9]{64}$/.test(id)) stack.sessionIds.add(id);
        }
        await Promise.all(captured);
      }
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
