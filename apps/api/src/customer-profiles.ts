import type { GetMe } from "@arrosticini/identity";
import type { CustomerProfiles } from "@arrosticini/payments";

export function identityCustomerProfiles(getMe: GetMe): CustomerProfiles {
  return {
    async find(actor) {
      const user = await getMe.execute(actor);
      return { email: user.email, name: `${user.firstName} ${user.lastName}` };
    },
  };
}
