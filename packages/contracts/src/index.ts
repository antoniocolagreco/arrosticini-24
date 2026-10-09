import { catalogContract } from "./catalog.js";
import { identityContract } from "./identity.js";
import { opsContract } from "./ops.js";
import { orderingContract } from "./ordering.js";
import { paymentsContract } from "./payments.js";
import { shoppingContract } from "./shopping.js";

export { ACTOR_HEADER, ActorDto } from "./actor.js";
export {
  catalogContract,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_TYPES,
  ProductDto,
  ProductImageDto,
  ProductSlug,
  ProductStatus,
} from "./catalog.js";
export { CurrencyDto, IdDto, LocaleDto, localizedTextDto } from "./common.js";
export {
  AddressDto,
  Email,
  identityContract,
  MAX_ADDRESSES_PER_USER,
  Password,
  Role,
  UserDto,
} from "./identity.js";
export { opsContract, WhoAmIDto } from "./ops.js";
export {
  OrderDto,
  OrderLineDto,
  OrderStatus,
  orderingContract,
  ShipmentDto,
  ShippingAddressDto,
} from "./ordering.js";
export { PaymentMethodDto, paymentsContract } from "./payments.js";
export { CartDto, CartLineDto, MAX_LINE_QUANTITY, shoppingContract } from "./shopping.js";

export const contract = {
  catalog: catalogContract,
  identity: identityContract,
  shopping: shoppingContract,
  ordering: orderingContract,
  payments: paymentsContract,
  ops: opsContract,
};
