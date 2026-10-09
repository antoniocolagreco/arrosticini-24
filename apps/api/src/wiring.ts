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
  DynamoDbOrderRepository,
  GetOrder,
  ListAllOrders,
  ListOrders,
  orderingRouter,
  PlaceOrder,
} from "@arrosticini/ordering";
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
import { shoppingCartReader } from "./cart-reader.js";
import { catalogPricing } from "./catalog-pricing.js";
import { identityCustomerDirectory } from "./customer-directory.js";
import { catalogProductAvailability } from "./product-availability.js";

export interface Tables {
  catalog: string;
  identity: string;
  ordering: string;
}

export function createRouter(dynamo: DynamoDBDocumentClient, valkey: Valkey, tables: Tables) {
  const products = new DynamoDbProductRepository(dynamo, tables.catalog);
  const users = new DynamoDbUserRepository(dynamo, tables.identity);
  const carts = new ValkeyCartRepository(valkey);
  const orders = new DynamoDbOrderRepository(dynamo, tables.ordering);
  const hasher = new ScryptPasswordHasher();
  const getProduct = new GetProduct(products);
  const listAddresses = new ListAddresses(users);
  const getCart = new GetCart(carts);
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
      listAddresses,
      addAddress: new AddAddress(users),
      updateAddress: new UpdateAddress(users),
      deleteAddress: new DeleteAddress(users),
    }),
    shopping: shoppingRouter({
      createCart: new CreateCart(carts),
      getCart,
      setCartLine: new SetCartLine(carts, catalogProductAvailability(getProduct)),
      mergeCart: new MergeCart(carts),
    }),
    ordering: orderingRouter({
      placeOrder: new PlaceOrder(
        orders,
        shoppingCartReader(getCart),
        catalogPricing(getProduct),
        identityCustomerDirectory(listAddresses),
      ),
      listOrders: new ListOrders(orders),
      getOrder: new GetOrder(orders),
      listAllOrders: new ListAllOrders(orders),
    }),
  };
}

export type ApiRouter = ReturnType<typeof createRouter>;
