import { describe, expect, it } from "vitest";
import { createLogger } from "./logger.js";

describe("createLogger", () => {
  it("never writes passwords", () => {
    const lines: Record<string, unknown>[] = [];
    const logger = createLogger(
      { service: "api", version: "v1.0.0", level: "info", pretty: false },
      { write: (line: string) => lines.push(JSON.parse(line)) },
    );

    logger.info({ body: { username: "antonio", password: "pecora" } }, "register");

    expect(lines[0]).toEqual(
      expect.objectContaining({ body: { username: "antonio", password: "[REDACTED]" } }),
    );
  });
});
