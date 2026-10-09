import { DomainError } from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { type AddressFields, User } from "./user.js";

const now = new Date("2026-10-08T10:00:00.000Z");

function user(): User {
  return User.register(
    {
      id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
      email: "mario.rossi@example.com",
      password: { hash: "aGFzaA==", salt: "c2FsdA==" },
      role: "customer",
      firstName: "Mario",
      lastName: "Rossi",
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
  phone: "+39 333 0000000",
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
  it.each(["mario", "Mario.Rossi@example.com", "mario rossi@example.com"])(
    "rejects email %o",
    (email) => {
      expect(() =>
        User.register(
          {
            id: "01JB2Q7Z8X4M3N5P6R7S8T9V0W",
            email,
            password: { hash: "aGFzaA==", salt: "c2FsdA==" },
            role: "customer",
            firstName: "Mario",
            lastName: "Rossi",
            preferredLocale: "it",
          },
          now,
        ),
      ).toThrow(new DomainError("INVALID_EMAIL", `Invalid email: ${email}`));
    },
  );
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

  it("updates fields and clears the second address line with null", () => {
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

  it("updates the profile names", () => {
    const target = user();

    target.updateProfile({ firstName: "Lucia", lastName: "Bianchi" });

    expect([target.firstName, target.lastName, target.email]).toEqual([
      "Lucia",
      "Bianchi",
      "mario.rossi@example.com",
    ]);
  });

  it("fails on an unknown address", () => {
    expect(() => user().removeAddress(ids[0] as string)).toThrow(
      expect.objectContaining({ code: "ADDRESS_NOT_FOUND" }),
    );
  });
});

describe("User status", () => {
  it("starts active, can be suspended and reactivated", () => {
    const target = user();
    expect(target.status).toBe("ACTIVE");

    target.suspend();
    expect(target.status).toBe("SUSPENDED");

    target.reactivate();
    expect(target.status).toBe("ACTIVE");
  });

  it("never suspends an admin", () => {
    const admin = User.register(
      {
        id: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
        email: "admin@example.com",
        password: { hash: "aGFzaA==", salt: "c2FsdA==" },
        role: "admin",
        firstName: "Admin",
        lastName: "Arrosticini 24ore",
        preferredLocale: "it",
      },
      now,
    );

    expect(() => admin.suspend()).toThrow(
      expect.objectContaining({ code: "USER_NOT_SUSPENDABLE" }),
    );
    expect(admin.status).toBe("ACTIVE");
  });
});
