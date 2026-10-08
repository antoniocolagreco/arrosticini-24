import { catalogContract } from "./catalog.js";
import { identityContract } from "./identity.js";
import { opsContract } from "./ops.js";

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
  identityContract,
  MAX_ADDRESSES_PER_USER,
  Password,
  Role,
  UserDto,
  Username,
} from "./identity.js";
export { opsContract, WhoAmIDto } from "./ops.js";

export const contract = {
  catalog: catalogContract,
  identity: identityContract,
  ops: opsContract,
};
