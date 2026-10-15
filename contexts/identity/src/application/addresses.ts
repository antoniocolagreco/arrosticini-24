import { type Id, newId } from "@arrosticini/kernel";
import type { Address, AddressChanges, AddressFields } from "../domain/user.js";
import type { UserRepository } from "../domain/user-repository.js";
import { type Actor, loadActingUser } from "./actor.js";

export class ListAddresses {
  readonly #users: UserRepository;

  constructor(users: UserRepository) {
    this.#users = users;
  }

  async execute(actor: Actor | undefined): Promise<readonly Address[]> {
    return (await loadActingUser(this.#users, actor)).addresses;
  }
}

export class AddAddress {
  readonly #users: UserRepository;

  constructor(users: UserRepository) {
    this.#users = users;
  }

  async execute(
    actor: Actor | undefined,
    fields: AddressFields,
    isDefault: boolean,
  ): Promise<Address> {
    const user = await loadActingUser(this.#users, actor);
    const address = user.addAddress(newId(), fields, isDefault);
    await this.#users.save(user);
    return address;
  }
}

export class UpdateAddress {
  readonly #users: UserRepository;

  constructor(users: UserRepository) {
    this.#users = users;
  }

  async execute(actor: Actor | undefined, id: Id, changes: AddressChanges): Promise<Address> {
    const user = await loadActingUser(this.#users, actor);
    const address = user.updateAddress(id, changes);
    await this.#users.save(user);
    return address;
  }
}

export class DeleteAddress {
  readonly #users: UserRepository;

  constructor(users: UserRepository) {
    this.#users = users;
  }

  async execute(actor: Actor | undefined, id: Id): Promise<void> {
    const user = await loadActingUser(this.#users, actor);
    user.removeAddress(id);
    await this.#users.save(user);
  }
}
