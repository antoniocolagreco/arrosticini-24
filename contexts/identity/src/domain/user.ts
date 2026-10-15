import { DomainError, type Id, type Locale } from "@arrosticini/kernel";
import type { PasswordHash } from "./password-hasher.js";

export const MAX_ADDRESSES = 5;

export type Role = "customer" | "admin";

export type UserStatus = "ACTIVE" | "SUSPENDED";

export interface Address {
  readonly id: Id;
  readonly fullName: string;
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly postalCode: string;
  readonly country: string;
  readonly phone: string;
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
  phone?: string;
  isDefault?: true;
}

export interface ProfileChanges {
  firstName?: string;
  lastName?: string;
  preferredLocale?: Locale;
}

export interface UserProps {
  id: Id;
  email: string;
  password: PasswordHash;
  role: Role;
  status: UserStatus;
  firstName: string;
  lastName: string;
  preferredLocale: Locale;
  createdAt: Date;
  addresses: Address[];
}

const EMAIL_PATTERN = /^[^\s@A-Z]+@[^\s@A-Z]+$/;

export class User {
  readonly #props: UserProps;

  private constructor(props: UserProps) {
    this.#props = props;
  }

  static register(props: Omit<UserProps, "status" | "createdAt" | "addresses">, now: Date): User {
    if (!EMAIL_PATTERN.test(props.email)) {
      throw new DomainError("INVALID_EMAIL", `Invalid email: ${props.email}`);
    }
    return new User({ ...props, status: "ACTIVE", createdAt: now, addresses: [] });
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  get id(): Id {
    return this.#props.id;
  }

  get email(): string {
    return this.#props.email;
  }

  get password(): PasswordHash {
    return this.#props.password;
  }

  get role(): Role {
    return this.#props.role;
  }

  get status(): UserStatus {
    return this.#props.status;
  }

  get firstName(): string {
    return this.#props.firstName;
  }

  get lastName(): string {
    return this.#props.lastName;
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

  suspend(): void {
    if (this.#props.role === "admin") {
      throw new DomainError("USER_NOT_SUSPENDABLE", `Admin ${this.id} cannot be suspended`);
    }
    this.#props.status = "SUSPENDED";
  }

  reactivate(): void {
    this.#props.status = "ACTIVE";
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

  updateAddress(id: Id, { line2, isDefault, ...changes }: AddressChanges): Address {
    const current = this.#findAddress(id);
    const merged: Address = { ...current, ...changes, isDefault: isDefault ?? current.isDefault };
    const updated = applyLine2(merged, line2);
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

function applyLine2(address: Address, line2: string | null | undefined): Address {
  if (line2 === undefined) {
    return address;
  }
  const { line2: _removed, ...rest } = address;
  return line2 === null ? rest : { ...rest, line2 };
}
