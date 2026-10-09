import {
  AddProductImage,
  CreateProduct,
  catalogRouter,
  DynamoDbProductRepository,
  GetProduct,
  ListProducts,
  RemoveProductImage,
  S3ImageStorage,
  UpdateProduct,
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
import type { WhoAmI } from "@arrosticini/ops";
import {
  CancelOrder,
  ChangeShippingAddress,
  CloseOrder,
  DynamoDbOrderRepository,
  GetOrder,
  ListAllOrders,
  ListOrders,
  MarkOrderPaid,
  orderingRouter,
  PlaceOrder,
  ShipOrder,
} from "@arrosticini/ordering";
import {
  CreateSetupSession,
  DeletePaymentMethod,
  DynamoDbPaymentCustomerRepository,
  DynamoDbPaymentRepository,
  DynamoDbProcessedEventRepository,
  HandleStripeEvent,
  ListPaymentMethods,
  type PaymentExpired,
  type PaymentSucceeded,
  paymentsRouter,
  StartCheckout,
  StripePaymentGateway,
} from "@arrosticini/payments";
import {
  CreateCart,
  EmptyOwnedCart,
  GetCart,
  MergeCart,
  SetCartLine,
  shoppingRouter,
  ValkeyCartRepository,
} from "@arrosticini/shopping";
import type { S3Client } from "@aws-sdk/client-s3";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { Valkey } from "iovalkey";
import type Stripe from "stripe";
import { shoppingCartReader } from "./cart-reader.js";
import { catalogPricing } from "./catalog-pricing.js";
import { identityCustomerDirectory } from "./customer-directory.js";
import { identityCustomerProfiles } from "./customer-profiles.js";
import { InProcessEventBus } from "./event-bus.js";
import { opsRouter } from "./ops-router.js";
import { paymentsInitiator } from "./payment-initiator.js";
import { catalogProductAvailability } from "./product-availability.js";

export interface Tables {
  catalog: string;
  identity: string;
  ordering: string;
  payments: string;
}

export interface Clients {
  dynamo: DynamoDBDocumentClient;
  s3: S3Client;
  valkey: Valkey;
  stripe: Stripe;
}

export interface Settings {
  tables: Tables;
  mediaBucket: string;
  stripeWebhookSecret: string;
  whoami: () => WhoAmI;
}

export function createApi(
  { dynamo, s3, valkey, stripe }: Clients,
  { tables, mediaBucket, stripeWebhookSecret, whoami }: Settings,
) {
  const products = new DynamoDbProductRepository(dynamo, tables.catalog);
  const images = new S3ImageStorage(s3, mediaBucket);
  const users = new DynamoDbUserRepository(dynamo, tables.identity);
  const carts = new ValkeyCartRepository(valkey);
  const orders = new DynamoDbOrderRepository(dynamo, tables.ordering);
  const payments = new DynamoDbPaymentRepository(dynamo, tables.payments);
  const hasher = new ScryptPasswordHasher();
  const getProduct = new GetProduct(products);
  const getMe = new GetMe(users);
  const listAddresses = new ListAddresses(users);
  const getCart = new GetCart(carts);
  const gateway = new StripePaymentGateway(stripe, stripeWebhookSecret);
  const stripeCustomers = {
    customers: new DynamoDbPaymentCustomerRepository(dynamo, tables.payments),
    profiles: identityCustomerProfiles(getMe),
    gateway,
  };
  const bus = new InProcessEventBus();
  const markOrderPaid = new MarkOrderPaid(orders);
  const cancelOrder = new CancelOrder(orders);
  const emptyOwnedCart = new EmptyOwnedCart(carts);
  bus.subscribe<PaymentSucceeded>("PaymentSucceeded", async ({ payload }) => {
    await markOrderPaid.execute(payload.orderId);
    await emptyOwnedCart.execute(payload.userId);
  });
  bus.subscribe<PaymentExpired>("PaymentExpired", async ({ payload }) => {
    await cancelOrder.execute(payload.orderId);
  });
  const router = {
    catalog: catalogRouter({
      listProducts: new ListProducts(products),
      getProduct,
      createProduct: new CreateProduct(products),
      updateProduct: new UpdateProduct(products),
      addProductImage: new AddProductImage(products, images),
      removeProductImage: new RemoveProductImage(products, images),
    }),
    identity: identityRouter({
      registerUser: new RegisterUser(users, hasher),
      verifyCredentials: new VerifyCredentials(users, hasher),
      getMe,
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
        paymentsInitiator(new StartCheckout(payments, stripeCustomers)),
      ),
      listOrders: new ListOrders(orders),
      getOrder: new GetOrder(orders),
      listAllOrders: new ListAllOrders(orders),
      changeShippingAddress: new ChangeShippingAddress(orders),
      shipOrder: new ShipOrder(orders),
      closeOrder: new CloseOrder(orders),
    }),
    ops: opsRouter(whoami),
    payments: paymentsRouter({
      listPaymentMethods: new ListPaymentMethods(stripeCustomers),
      createSetupSession: new CreateSetupSession(stripeCustomers),
      deletePaymentMethod: new DeletePaymentMethod(stripeCustomers),
    }),
  };
  const handleStripeEvent = new HandleStripeEvent(
    payments,
    new DynamoDbProcessedEventRepository(dynamo, tables.payments),
    gateway,
    bus,
  );
  return { router, handleStripeEvent };
}

export type Api = ReturnType<typeof createApi>;

export type ApiRouter = Api["router"];
