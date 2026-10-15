import { describe, expect, it } from "vitest";
import { localeCookie, pathLocale, preferredLocale } from "./locale.server.js";

describe("path locale", () => {
  it.each([
    ["http://localhost/en", "en"],
    ["http://localhost/en.data", "en"],
    ["http://localhost/en/products.data", "en"],
    ["http://localhost/it/products/arrosticini-75?q=x", "it"],
    ["http://localhost/", null],
  ])("reads %s as %s", (url, expected) => {
    expect(pathLocale(url)).toBe(expected);
  });
});

describe("preferred locale", () => {
  it("defaults to Italian", async () => {
    expect(await preferredLocale(new Request("http://localhost/"))).toBe("it");
  });

  it.each([
    ["en-US,en;q=0.9,it;q=0.8", "en"],
    ["en;q=0.2,it-IT;q=0.9", "it"],
    ["fr,de;q=0.9,en;q=0.4", "en"],
    ["en;q=0,it;q=0.5", "it"],
    ["en;q=invalid,it;q=0.5", "it"],
    ["fr", "it"],
  ])("negotiates %s as %s", async (acceptLanguage, expected) => {
    const request: Request = new Request("http://localhost/", {
      headers: { "accept-language": acceptLanguage },
    });
    expect(await preferredLocale(request)).toBe(expected);
  });

  it("uses the saved locale before the browser preference", async () => {
    const cookie: string = await localeCookie.serialize("it");
    const request: Request = new Request("http://localhost/", {
      headers: { cookie, "accept-language": "en" },
    });
    expect(await preferredLocale(request)).toBe("it");
  });

  it("ignores unsupported cookie values", async () => {
    const cookie: string = await localeCookie.serialize("fr");
    const request: Request = new Request("http://localhost/", {
      headers: { cookie, "accept-language": "en" },
    });
    expect(await preferredLocale(request)).toBe("en");
  });
});
