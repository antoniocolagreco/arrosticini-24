import { paymentsContract } from "@arrosticini/contracts";
import { implement } from "@orpc/server";
import type { Actor } from "../application/actor.js";
import type {
  CreateSetupSession,
  DeletePaymentMethod,
  ListPaymentMethods,
} from "../application/payment-methods.js";

export interface PaymentsContext {
  actor: Actor | undefined;
}

export interface PaymentsUseCases {
  listPaymentMethods: ListPaymentMethods;
  createSetupSession: CreateSetupSession;
  deletePaymentMethod: DeletePaymentMethod;
}

const os = implement(paymentsContract).$context<PaymentsContext>();

export function paymentsRouter(useCases: PaymentsUseCases) {
  return {
    listPaymentMethods: os.listPaymentMethods.handler(async ({ context }) => ({
      items: await useCases.listPaymentMethods.execute(context.actor),
    })),
    createSetupSession: os.createSetupSession.handler(async ({ input, context }) => ({
      url: await useCases.createSetupSession.execute(context.actor, input),
    })),
    deletePaymentMethod: os.deletePaymentMethod.handler(async ({ input, context }) => {
      await useCases.deletePaymentMethod.execute(context.actor, input.id);
    }),
  };
}
