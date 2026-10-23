import { describe, expect, it } from "vitest";
import { isHttpsOrigin } from "./utils.js";

describe("https origin", () => {
  it.each([
    ["https://arrosticini.colagreco.dev", true],
    ["https://d111111abcdef8.cloudfront.net", true],
    ["http://arrosticini-123456789.eu-south-1.elb.amazonaws.com", false],
    ["http://localhost:3100", false],
    [undefined, false],
  ])("reads %s as %s", (origin, expected) => {
    expect(isHttpsOrigin(origin)).toBe(expected);
  });
});
