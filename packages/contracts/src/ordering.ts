import { z } from "zod";
import { ProductSlug } from "./catalog.js";
import { admin, authed, CurrencyDto, IdDto, LocaleDto, localizedTextDto } from "./common.js";
import { AddressFields } from "./identity.js";

export const OrderStatus = z.enum([
  "PENDING_PAYMENT",
  "PAID",
  "CANCELLED",
  "SHIPPED",
  "DELIVERED",
  "LOST",
]);

export const ShipmentDto = z.object({
  carrier: z.string().trim().min(1).max(60),
  trackingNumber: z.string().trim().min(1).max(60).optional(),
  trackingUrl: z
    .url({ protocol: /^https$/ })
    .max(500)
    .optional(),
});

export const OrderLineDto = z.object({
  slug: ProductSlug,
  name: localizedTextDto(120),
  unitPriceCents: z.number().int().nonnegative(),
  quantity: z.number().int().min(1),
});

export const ShippingAddressDto = z.object({
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  phone: z.string(),
});

export const OrderDto = z.object({
  id: IdDto,
  userId: IdDto,
  lines: z.array(OrderLineDto),
  shippingAddress: ShippingAddressDto,
  totalCents: z.number().int().nonnegative(),
  currency: CurrencyDto,
  status: OrderStatus,
  shipment: ShipmentDto.optional(),
  createdAt: z.iso.datetime(),
  paidAt: z.iso.datetime().optional(),
});

export type OrderStatus = z.infer<typeof OrderStatus>;
export type ShipmentDto = z.infer<typeof ShipmentDto>;
export type OrderLineDto = z.infer<typeof OrderLineDto>;
export type ShippingAddressDto = z.infer<typeof ShippingAddressDto>;
export type OrderDto = z.infer<typeof OrderDto>;

export const placeOrder = authed
  .route({ method: "POST", path: "/ordering/orders", successStatus: 201 })
  .input(z.object({ cartId: IdDto, addressId: IdDto, locale: LocaleDto, ordersUrl: z.url() }))
  .output(z.object({ order: OrderDto, paymentUrl: z.url() }))
  .errors({
    FORBIDDEN: { status: 403 },
    CART_NOT_FOUND: { status: 404 },
    CART_EMPTY: { status: 422 },
    ADDRESS_NOT_FOUND: { status: 404 },
    PRODUCT_UNAVAILABLE: { status: 422 },
  });

export const listOrders = authed
  .route({ method: "GET", path: "/ordering/orders" })
  .output(z.object({ items: z.array(OrderDto) }));

export const getOrder = authed
  .route({ method: "GET", path: "/ordering/orders/{id}" })
  .input(z.object({ id: IdDto }))
  .output(OrderDto)
  .errors({ ORDER_NOT_FOUND: { status: 404 } });

export const listAllOrders = admin
  .route({ method: "GET", path: "/ordering/admin/orders" })
  .input(z.object({ userId: IdDto.optional() }))
  .output(z.object({ items: z.array(OrderDto) }));

const orderNotFound = { ORDER_NOT_FOUND: { status: 404 } } as const;

export const changeShippingAddress = admin
  .route({ method: "PUT", path: "/ordering/admin/orders/{id}/shipping-address" })
  .input(z.object({ id: IdDto, ...AddressFields }))
  .output(OrderDto)
  .errors({ ...orderNotFound, ORDER_NOT_EDITABLE: { status: 409 } });

export const shipOrder = admin
  .route({ method: "PUT", path: "/ordering/admin/orders/{id}/shipment" })
  .input(z.object({ id: IdDto, ...ShipmentDto.shape }))
  .output(OrderDto)
  .errors({ ...orderNotFound, ORDER_INVALID_TRANSITION: { status: 409 } });

export const closeOrder = admin
  .route({ method: "POST", path: "/ordering/admin/orders/{id}/close" })
  .input(z.object({ id: IdDto, status: z.enum(["DELIVERED", "LOST"]) }))
  .output(OrderDto)
  .errors({ ...orderNotFound, ORDER_INVALID_TRANSITION: { status: 409 } });

export const orderingContract = {
  placeOrder,
  listOrders,
  getOrder,
  listAllOrders,
  changeShippingAddress,
  shipOrder,
  closeOrder,
};
