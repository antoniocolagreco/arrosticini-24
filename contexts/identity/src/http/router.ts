import { type AddressDto, identityContract, type UserDto } from "@arrosticini/contracts";
import { implement } from "@orpc/server";
import type { ChangePassword, GetMe, UpdateMe } from "../application/account.js";
import type { Actor } from "../application/actor.js";
import type {
  AddAddress,
  DeleteAddress,
  ListAddresses,
  UpdateAddress,
} from "../application/addresses.js";
import type { GetUser, ListUsers, SetUserStatus } from "../application/administration.js";
import type { RegisterUser, VerifyCredentials } from "../application/registration.js";
import type { Address, User } from "../domain/user.js";

export interface IdentityContext {
  actor: Actor | undefined;
}

export interface IdentityUseCases {
  registerUser: RegisterUser;
  verifyCredentials: VerifyCredentials;
  getMe: GetMe;
  updateMe: UpdateMe;
  changePassword: ChangePassword;
  listAddresses: ListAddresses;
  addAddress: AddAddress;
  updateAddress: UpdateAddress;
  deleteAddress: DeleteAddress;
  listUsers: ListUsers;
  getUser: GetUser;
  setUserStatus: SetUserStatus;
}

type Defined<T> = { [K in keyof T]: Exclude<T[K], undefined> };

function defined<T extends object>(value: T): Defined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Defined<T>;
}

const os = implement(identityContract).$context<IdentityContext>();

function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    firstName: user.firstName,
    lastName: user.lastName,
    preferredLocale: user.preferredLocale,
    createdAt: user.createdAt.toISOString(),
  };
}

function toAddressDto(address: Address): AddressDto {
  return { ...address };
}

export function identityRouter(useCases: IdentityUseCases) {
  return {
    registerUser: os.registerUser.handler(async ({ input }) =>
      toUserDto(await useCases.registerUser.execute(input)),
    ),
    verifyCredentials: os.verifyCredentials.handler(async ({ input }) =>
      toUserDto(await useCases.verifyCredentials.execute(input)),
    ),
    getMe: os.getMe.handler(async ({ context }) =>
      toUserDto(await useCases.getMe.execute(context.actor)),
    ),
    updateMe: os.updateMe.handler(async ({ input, context }) =>
      toUserDto(await useCases.updateMe.execute(context.actor, defined(input))),
    ),
    changePassword: os.changePassword.handler(async ({ input, context }) => {
      await useCases.changePassword.execute(context.actor, input);
    }),
    listAddresses: os.listAddresses.handler(async ({ context }) => ({
      items: (await useCases.listAddresses.execute(context.actor)).map(toAddressDto),
    })),
    addAddress: os.addAddress.handler(async ({ input: { isDefault, ...fields }, context }) =>
      toAddressDto(
        await useCases.addAddress.execute(context.actor, defined(fields), isDefault ?? false),
      ),
    ),
    updateAddress: os.updateAddress.handler(async ({ input: { id, ...changes }, context }) =>
      toAddressDto(await useCases.updateAddress.execute(context.actor, id, defined(changes))),
    ),
    deleteAddress: os.deleteAddress.handler(async ({ input, context }) => {
      await useCases.deleteAddress.execute(context.actor, input.id);
    }),
    listUsers: os.listUsers.handler(async ({ context }) => ({
      items: (await useCases.listUsers.execute(context.actor)).map(toUserDto),
    })),
    getUser: os.getUser.handler(async ({ input, context }) => {
      const user = await useCases.getUser.execute(context.actor, input.id);
      return { user: toUserDto(user), addresses: user.addresses.map(toAddressDto) };
    }),
    setUserStatus: os.setUserStatus.handler(async ({ input, context }) =>
      toUserDto(await useCases.setUserStatus.execute(context.actor, input.id, input.status)),
    ),
  };
}
