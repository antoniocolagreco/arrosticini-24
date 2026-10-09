import { describe, expect, it } from "vitest";
import { AddressDto, Email } from "./identity.js";

describe("Email", () => {
  it("normalizes to lowercase without surrounding spaces", () => {
    expect(Email.parse("  Mario.Rossi@Example.COM ")).toBe("mario.rossi@example.com");
  });

  it.each([
    "mario",
    "mario@",
    "@example.com",
    "mario rossi@example.com",
    `${"a".repeat(250)}@x.it`,
  ])("rejects %o", (email) => {
    expect(Email.safeParse(email).success).toBe(false);
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
    phone: "+39 0871 000000",
    isDefault: true,
  };

  it("accepts an address without optional fields", () => {
    expect(AddressDto.safeParse(address).success).toBe(true);
  });

  it("requires a phone number for the courier", () => {
    const { phone: _phone, ...withoutPhone } = address;

    expect(AddressDto.safeParse(withoutPhone).success).toBe(false);
  });

  it.each(["it", "ITA", "I"])("rejects country %o", (country) => {
    expect(AddressDto.safeParse({ ...address, country }).success).toBe(false);
  });
});
