export {
  ChangePassword,
  type ChangePasswordCommand,
  GetMe,
  UpdateMe,
} from "./application/account.js";
export type { Actor } from "./application/actor.js";
export {
  AddAddress,
  DeleteAddress,
  ListAddresses,
  UpdateAddress,
} from "./application/addresses.js";
export {
  AuthorizeActor,
  GetUser,
  ListUsers,
  SetUserStatus,
} from "./application/administration.js";
export {
  type Credentials,
  EnsureAdmin,
  RegisterUser,
  type RegisterUserCommand,
  VerifyCredentials,
} from "./application/registration.js";
export type { PasswordHash, PasswordHasher } from "./domain/password-hasher.js";
export {
  type Address,
  type AddressChanges,
  type AddressFields,
  MAX_ADDRESSES,
  type ProfileChanges,
  type Role,
  User,
  type UserProps,
  type UserStatus,
} from "./domain/user.js";
export type { UserRepository } from "./domain/user-repository.js";
export { type IdentityContext, type IdentityUseCases, identityRouter } from "./http/router.js";
export { DynamoDbUserRepository } from "./infrastructure/dynamodb-user-repository.js";
export { identityTableDefinition } from "./infrastructure/identity-table.js";
export { ScryptPasswordHasher } from "./infrastructure/scrypt-password-hasher.js";
