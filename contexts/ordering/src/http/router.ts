import { type OrderDto, orderingContract } from "@arrosticini/contracts";
import { implement } from "@orpc/server";
import type { Actor } from "../application/actor.js";
import type { GetOrder, ListAllOrders, ListOrders, PlaceOrder } from "../application/orders.js";
import type { Order } from "../domain/order.js";

export interface OrderingContext {
  actor: Actor | undefined;
}

export interface OrderingUseCases {
  placeOrder: PlaceOrder;
  listOrders: ListOrders;
  getOrder: GetOrder;
  listAllOrders: ListAllOrders;
}

const os = implement(orderingContract).$context<OrderingContext>();

function toDto(order: Order): OrderDto {
  return {
    id: order.id,
    userId: order.userId,
    lines: order.lines.map(({ slug, name, unitPrice, quantity }) => ({
      slug,
      name: { ...name },
      unitPriceCents: unitPrice.amountCents,
      quantity,
    })),
    shippingAddress: { ...order.shippingAddress },
    totalCents: order.total.amountCents,
    currency: order.total.currency,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    ...(order.paidAt === undefined ? {} : { paidAt: order.paidAt.toISOString() }),
  };
}

export function orderingRouter(useCases: OrderingUseCases) {
  return {
    placeOrder: os.placeOrder.handler(async ({ input, context }) => {
      const { order, paymentUrl } = await useCases.placeOrder.execute(context.actor, input);
      return { order: toDto(order), paymentUrl };
    }),
    listOrders: os.listOrders.handler(async ({ context }) => ({
      items: (await useCases.listOrders.execute(context.actor)).map(toDto),
    })),
    getOrder: os.getOrder.handler(async ({ input, context }) =>
      toDto(await useCases.getOrder.execute(context.actor, input.id)),
    ),
    listAllOrders: os.listAllOrders.handler(async ({ context }) => ({
      items: (await useCases.listAllOrders.execute(context.actor)).map(toDto),
    })),
  };
}
