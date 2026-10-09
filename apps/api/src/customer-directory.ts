import type { ListAddresses } from "@arrosticini/identity";
import type { CustomerDirectory } from "@arrosticini/ordering";

export function identityCustomerDirectory(listAddresses: ListAddresses): CustomerDirectory {
  return {
    async shippingAddress(actor, addressId) {
      const address = (await listAddresses.execute(actor)).find(({ id }) => id === addressId);
      if (address === undefined) return undefined;
      const { id: _id, isDefault: _isDefault, ...shippingAddress } = address;
      return shippingAddress;
    },
  };
}
