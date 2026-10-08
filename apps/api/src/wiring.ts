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
import {
  CreateCart,
  GetCart,
  MergeCart,
  SetCartLine,
  shoppingRouter,
  ValkeyCartRepository,
} from "@arrosticini/shopping";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { Valkey } from "iovalkey";
import { catalogProductAvailability } from "./product-availability.js";

export interface Tables {
  catalog: string;
  identity: string;
}

export function createRouter(dynamo: DynamoDBDocumentClient, valkey: Valkey, tables: Tables) {
  const products = new DynamoDbProductRepository(dynamo, tables.catalog);
  const users = new DynamoDbUserRepository(dynamo, tables.identity);
  const carts = new ValkeyCartRepository(valkey);
  const hasher = new ScryptPasswordHasher();
  const getProduct = new GetProduct(products);
  return {
    catalog: catalogRouter({
      listProducts: new ListProducts(products),
      getProduct,
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
    shopping: shoppingRouter({
      createCart: new CreateCart(carts),
      getCart: new GetCart(carts),
      setCartLine: new SetCartLine(carts, catalogProductAvailability(getProduct)),
      mergeCart: new MergeCart(carts),
    }),
  };
}

export type ApiRouter = ReturnType<typeof createRouter>;
