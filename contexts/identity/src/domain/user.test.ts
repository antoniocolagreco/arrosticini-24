import { DomainError } from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { type AddressFields, User } from "./user.js";

const now = new Date("2026-10-08T10:00:00.000Z");

function user(): User {
  return User.register(
    {
      id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
      username: "mario.r",
      password: { hash: "aGFzaA==", salt: "c2FsdA==" },
      role: "customer",
      preferredLocale: "it",
    },
    now,
  );
}

const home: AddressFields = {
  fullName: "Mario Rossi",
  line1: "Via Collegrande 10",
  city: "Chieti",
  postalCode: "66100",
  country: "IT",
};

const office: AddressFields = {
  fullName: "Mario Rossi",
  line1: "Corso Marrucino 5",
  line2: "Scala B",
  city: "Chieti",
  postalCode: "66100",
  country: "IT",
  phone: "+39 0871 000000",
};

const ids = [
  "01JB2Q7Z8X4M3N5P6R7S8T9V01",
  "01JB2Q7Z8X4M3N5P6R7S8T9V02",
  "01JB2Q7Z8X4M3N5P6R7S8T9V03",
  "01JB2Q7Z8X4M3N5P6R7S8T9V04",
  "01JB2Q7Z8X4M3N5P6R7S8T9V05",
  "01JB2Q7Z8X4M3N5P6R7S8T9V06",
];

function defaults(target: User) {
  return target.addresses.map(({ id, isDefault }) => ({ id, isDefault }));
}

describe("User.register", () => {
  it.each(["Mario", "ab", "mario rossi"])("rejects username %o", (username) => {
    expect(() =>
      User.register(
        {
          id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
          username,
          password: { hash: "aGFzaA==", salt: "c2FsdA==" },
          role: "customer",
          preferredLocale: "it",
        },
        now,
      ),
    ).toThrow(DomainError);
  });
});

describe("User addresses", () => {
  it("makes the first address the default", () => {
    const target = user();

    const address = target.addAddress(ids[0] as string, home, false);

    expect(address.isDefault).toBe(true);
  });

  it("moves the default to a new default address", () => {
    const target = user();
    target.addAddress(ids[0] as string, home, false);

    target.addAddress(ids[1] as string, office, true);

    expect(defaults(target)).toEqual([
      { id: ids[0], isDefault: false },
      { id: ids[1], isDefault: true },
    ]);
  });

  it("allows at most 5 addresses", () => {
    const target = user();
    for (const id of ids.slice(0, 5)) {
      target.addAddress(id, home, false);
    }

    expect(() => target.addAddress(ids[5] as string, home, false)).toThrow(
      new DomainError("ADDRESS_LIMIT_REACHED", "A user can have at most 5 addresses"),
    );
  });

  it("updates fields and clears optional ones with null", () => {
    const target = user();
    target.addAddress(ids[0] as string, office, false);

    const updated = target.updateAddress(ids[0] as string, {
      city: "Pescara",
      line2: null,
      phone: "+39 085 000000",
    });

    expect(updated).toEqual({
      id: ids[0],
      fullName: "Mario Rossi",
      line1: "Corso Marrucino 5",
      city: "Pescara",
      postalCode: "66100",
      country: "IT",
      phone: "+39 085 000000",
      isDefault: true,
    });
  });

  it("moves the default when an address becomes the default", () => {
    const target = user();
    target.addAddress(ids[0] as string, home, false);
    target.addAddress(ids[1] as string, office, false);

    target.updateAddress(ids[1] as string, { isDefault: true });

    expect(defaults(target)).toEqual([
      { id: ids[0], isDefault: false },
      { id: ids[1], isDefault: true },
    ]);
  });

  it("passes the default to the first remaining address", () => {
    const target = user();
    target.addAddress(ids[0] as string, home, false);
    target.addAddress(ids[1] as string, office, false);

    target.removeAddress(ids[0] as string);

    expect(defaults(target)).toEqual([{ id: ids[1], isDefault: true }]);
  });

  it("fails on an unknown address", () => {
    expect(() => user().removeAddress(ids[0] as string)).toThrow(
      expect.objectContaining({ code: "ADDRESS_NOT_FOUND" }),
    );
  });
});
