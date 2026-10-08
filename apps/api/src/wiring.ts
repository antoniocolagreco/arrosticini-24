import {
  catalogRouter,
  DynamoDbProductRepository,
  GetProduct,
  ListProducts,
} from "@arrosticini/catalog";
import {
  AddAddress,
  ChangePassword,
  DeleteAddress,
  DynamoDbUserRepository,
  GetMe,
  identityRouter,
  ListAddresses,
  RegisterUser,
  ScryptPasswordHasher,
  UpdateAddress,
  UpdateMe,
  VerifyCredentials,
} from "@arrosticini/identity";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export interface Tables {
  catalog: string;
  identity: string;
}

export function createRouter(dynamo: DynamoDBDocumentClient, tables: Tables) {
  const products = new DynamoDbProductRepository(dynamo, tables.catalog);
  const users = new DynamoDbUserRepository(dynamo, tables.identity);
  const hasher = new ScryptPasswordHasher();
  return {
    catalog: catalogRouter({
      listProducts: new ListProducts(products),
      getProduct: new GetProduct(products),
    }),
    identity: identityRouter({
      registerUser: new RegisterUser(users, hasher),
      verifyCredentials: new VerifyCredentials(users, hasher),
      getMe: new GetMe(users),
      updateMe: new UpdateMe(users),
      changePassword: new ChangePassword(users, hasher),
      listAddresses: new ListAddresses(users),
      addAddress: new AddAddress(users),
      updateAddress: new UpdateAddress(users),
      deleteAddress: new DeleteAddress(users),
    }),
  };
}

export type ApiRouter = ReturnType<typeof createRouter>;
