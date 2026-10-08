import { describe, expect, it } from "vitest";
import { AddressDto, Username } from "./identity.js";

describe("Username", () => {
  it("normalizes to lowercase without surrounding spaces", () => {
    expect(Username.parse("  Mario.R ")).toBe("mario.r");
  });

  it.each(["ab", "a".repeat(33), "mario rossi", "mario!"])("rejects %o", (username) => {
    expect(Username.safeParse(username).success).toBe(false);
  });
});

describe("AddressDto", () => {
  const address = {
    id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
    fullName: "Mario Rossi",
    line1: "Via Collegrande 10",
    city: "Chieti",
    postalCode: "66100",
    country: "IT",
    isDefault: true,
  };

  it("accepts an address without optional fields", () => {
    expect(AddressDto.safeParse(address).success).toBe(true);
  });

  it.each(["it", "ITA", "I"])("rejects country %o", (country) => {
    expect(AddressDto.safeParse({ ...address, country }).success).toBe(false);
  });
});
