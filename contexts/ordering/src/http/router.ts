import { type OrderDto, orderingContract } from "@arrosticini/contracts";
import { implement } from "@orpc/server";
import type { Actor } from "../application/actor.js";
import type {
  ChangeShippingAddress,
  CloseOrder,
  GetOrder,
  ListAllOrders,
  ListOrders,
  PlaceOrder,
  ShipOrder,
} from "../application/orders.js";
import type { Order } from "../domain/order.js";

export interface OrderingContext {
  actor: Actor | undefined;
}

export interface OrderingUseCases {
  placeOrder: PlaceOrder;
  listOrders: ListOrders;
  getOrder: GetOrder;
  listAllOrders: ListAllOrders;
  changeShippingAddress: ChangeShippingAddress;
  shipOrder: ShipOrder;
  closeOrder: CloseOrder;
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
    ...(order.shipment === undefined ? {} : { shipment: { ...order.shipment } }),
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
    listAllOrders: os.listAllOrders.handler(async ({ input, context }) => ({
      items: (await useCases.listAllOrders.execute(context.actor, input.userId)).map(toDto),
    })),
    changeShippingAddress: os.changeShippingAddress.handler(
      async ({ input: { id, line2, ...address }, context }) =>
        toDto(
          await useCases.changeShippingAddress.execute(context.actor, id, {
            ...address,
            ...(line2 === undefined ? {} : { line2 }),
          }),
        ),
    ),
    shipOrder: os.shipOrder.handler(
      async ({ input: { id, carrier, trackingNumber, trackingUrl }, context }) =>
        toDto(
          await useCases.shipOrder.execute(context.actor, id, {
            carrier,
            trackingNumber,
            ...(trackingUrl === undefined ? {} : { trackingUrl }),
          }),
        ),
    ),
    closeOrder: os.closeOrder.handler(async ({ input, context }) =>
      toDto(await useCases.closeOrder.execute(context.actor, input.id, input.status)),
    ),
  };
}
