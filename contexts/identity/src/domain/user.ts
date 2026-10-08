import { DomainError, type Id, type Locale } from "@arrosticini/kernel";
import type { PasswordHash } from "./password-hasher.js";

export const MAX_ADDRESSES = 5;

export type Role = "customer" | "admin";

export interface Address {
  readonly id: Id;
  readonly fullName: string;
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly postalCode: string;
  readonly country: string;
  readonly phone?: string;
  readonly isDefault: boolean;
}

export type AddressFields = Omit<Address, "id" | "isDefault">;

export interface AddressChanges {
  fullName?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string | null;
  isDefault?: true;
}

export interface ProfileChanges {
  displayName?: string;
  email?: string;
  preferredLocale?: Locale;
}

export interface UserProps {
  id: Id;
  username: string;
  password: PasswordHash;
  role: Role;
  displayName?: string;
  email?: string;
  preferredLocale: Locale;
  createdAt: Date;
  addresses: Address[];
}

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export class User {
  readonly #props: UserProps;

  private constructor(props: UserProps) {
    this.#props = props;
  }

  static register(props: Omit<UserProps, "createdAt" | "addresses">, now: Date): User {
    if (!USERNAME_PATTERN.test(props.username)) {
      throw new DomainError("INVALID_USERNAME", `Invalid username: ${props.username}`);
    }
    return new User({ ...props, createdAt: now, addresses: [] });
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  get id(): Id {
    return this.#props.id;
  }

  get username(): string {
    return this.#props.username;
  }

  get password(): PasswordHash {
    return this.#props.password;
  }

  get role(): Role {
    return this.#props.role;
  }

  get displayName(): string | undefined {
    return this.#props.displayName;
  }

  get email(): string | undefined {
    return this.#props.email;
  }

  get preferredLocale(): Locale {
    return this.#props.preferredLocale;
  }

  get createdAt(): Date {
    return this.#props.createdAt;
  }

  get addresses(): readonly Address[] {
    return this.#props.addresses;
  }

  updateProfile(changes: ProfileChanges): void {
    Object.assign(this.#props, changes);
  }

  changePassword(password: PasswordHash): void {
    this.#props.password = password;
  }

  addAddress(id: Id, fields: AddressFields, isDefault: boolean): Address {
    if (this.#props.addresses.length >= MAX_ADDRESSES) {
      throw new DomainError(
        "ADDRESS_LIMIT_REACHED",
        `A user can have at most ${MAX_ADDRESSES} addresses`,
      );
    }
    const address: Address = {
      ...fields,
      id,
      isDefault: isDefault || this.#props.addresses.length === 0,
    };
    this.#props.addresses = [
      ...this.#props.addresses.map((other) =>
        address.isDefault ? { ...other, isDefault: false } : other,
      ),
      address,
    ];
    return address;
  }

  updateAddress(id: Id, { line2, phone, isDefault, ...changes }: AddressChanges): Address {
    const current = this.#findAddress(id);
    const merged: Address = { ...current, ...changes, isDefault: isDefault ?? current.isDefault };
    const updated = applyClearable(applyClearable(merged, "line2", line2), "phone", phone);
    this.#props.addresses = this.#props.addresses.map((other) => {
      if (other.id === id) {
        return updated;
      }
      return updated.isDefault ? { ...other, isDefault: false } : other;
    });
    return updated;
  }

  removeAddress(id: Id): void {
    const removed = this.#findAddress(id);
    const remaining = this.#props.addresses.filter((address) => address.id !== id);
    this.#props.addresses = remaining.map((address, index) =>
      removed.isDefault && index === 0 ? { ...address, isDefault: true } : address,
    );
  }

  #findAddress(id: Id): Address {
    const address = this.#props.addresses.find((candidate) => candidate.id === id);
    if (address === undefined) {
      throw new DomainError("ADDRESS_NOT_FOUND", `Address not found: ${id}`);
    }
    return address;
  }
}

function applyClearable(
  address: Address,
  key: "line2" | "phone",
  value: string | null | undefined,
): Address {
  if (value === undefined) {
    return address;
  }
  const { [key]: _removed, ...rest } = address;
  return value === null ? rest : { ...rest, [key]: value };
}
