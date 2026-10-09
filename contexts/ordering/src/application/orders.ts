import { DomainError, type Id, type Locale, newId } from "@arrosticini/kernel";
import { Order, type OrderLine, type Shipment, type ShippingAddress } from "../domain/order.js";
import type { OrderRepository } from "../domain/order-repository.js";
import { type Actor, requireActor, requireAdmin } from "./actor.js";
import type { CartReader, CatalogPricing, CustomerDirectory, PaymentInitiator } from "./ports.js";

export interface PlaceOrderCommand {
  cartId: Id;
  addressId: Id;
  locale: Locale;
  ordersUrl: string;
}

export interface PlacedOrder {
  order: Order;
  paymentUrl: string;
}

export class PlaceOrder {
  readonly #orders: OrderRepository;
  readonly #carts: CartReader;
  readonly #pricing: CatalogPricing;
  readonly #customers: CustomerDirectory;
  readonly #payments: PaymentInitiator;

  constructor(
    orders: OrderRepository,
    carts: CartReader,
    pricing: CatalogPricing,
    customers: CustomerDirectory,
    payments: PaymentInitiator,
  ) {
    this.#orders = orders;
    this.#carts = carts;
    this.#pricing = pricing;
    this.#customers = customers;
    this.#payments = payments;
  }

  async execute(
    actor: Actor | undefined,
    { cartId, addressId, locale, ordersUrl }: PlaceOrderCommand,
  ): Promise<PlacedOrder> {
    const buyer = requireActor(actor);
    if (buyer.role === "admin") {
      throw new DomainError("FORBIDDEN", "Admins cannot place orders");
    }
    const cart = await this.#carts.find(cartId);
    if (cart === undefined || cart.ownerId !== buyer.userId) {
      throw new DomainError("CART_NOT_FOUND", `Cart not found: ${cartId}`);
    }
    const shippingAddress = await this.#customers.shippingAddress(buyer, addressId);
    if (shippingAddress === undefined) {
      throw new DomainError("ADDRESS_NOT_FOUND", `Address not found: ${addressId}`);
    }
    const lines: OrderLine[] = [];
    for (const { slug, quantity } of cart.lines) {
      const price = await this.#pricing.price(slug);
      if (price === undefined) {
        throw new DomainError("PRODUCT_UNAVAILABLE", `Product unavailable: ${slug}`);
      }
      lines.push({ slug, name: price.name, unitPrice: price.unitPrice, quantity });
    }
    const order = Order.place(
      { id: newId(), userId: buyer.userId, lines, shippingAddress },
      new Date(),
    );
    await this.#orders.create(order);
    const paymentUrl = await this.#payments.start(buyer, {
      orderId: order.id,
      lines: order.lines,
      locale,
      returnUrl: `${ordersUrl.replace(/\/+$/, "")}/${order.id}`,
    });
    return { order, paymentUrl };
  }
}

export class MarkOrderPaid {
  readonly #orders: OrderRepository;

  constructor(orders: OrderRepository) {
    this.#orders = orders;
  }

  async execute(orderId: Id): Promise<void> {
    const order = await this.#orders.findById(orderId);
    if (order === undefined || order.paidAt !== undefined) {
      return;
    }
    order.markPaid(new Date());
    await this.#orders.save(order);
  }
}

export class CancelOrder {
  readonly #orders: OrderRepository;

  constructor(orders: OrderRepository) {
    this.#orders = orders;
  }

  async execute(orderId: Id): Promise<void> {
    const order = await this.#orders.findById(orderId);
    if (order === undefined || order.status === "CANCELLED") {
      return;
    }
    order.cancel();
    await this.#orders.save(order);
  }
}

export class ListOrders {
  readonly #orders: OrderRepository;

  constructor(orders: OrderRepository) {
    this.#orders = orders;
  }

  async execute(actor: Actor | undefined): Promise<Order[]> {
    return this.#orders.listByUser(requireActor(actor).userId);
  }
}

export class GetOrder {
  readonly #orders: OrderRepository;

  constructor(orders: OrderRepository) {
    this.#orders = orders;
  }

  async execute(actor: Actor | undefined, id: Id): Promise<Order> {
    const reader = requireActor(actor);
    const order = await this.#orders.findById(id);
    if (order === undefined || (order.userId !== reader.userId && reader.role !== "admin")) {
      throw new DomainError("ORDER_NOT_FOUND", `Order not found: ${id}`);
    }
    return order;
  }
}

export class ListAllOrders {
  readonly #orders: OrderRepository;

  constructor(orders: OrderRepository) {
    this.#orders = orders;
  }

  async execute(actor: Actor | undefined, userId?: Id): Promise<Order[]> {
    requireAdmin(actor, "list all orders");
    return userId === undefined ? this.#orders.listAll() : this.#orders.listByUser(userId);
  }
}

async function findOrder(orders: OrderRepository, id: Id): Promise<Order> {
  const order = await orders.findById(id);
  if (order === undefined) {
    throw new DomainError("ORDER_NOT_FOUND", `Order not found: ${id}`);
  }
  return order;
}

export class ChangeShippingAddress {
  readonly #orders: OrderRepository;

  constructor(orders: OrderRepository) {
    this.#orders = orders;
  }

  async execute(actor: Actor | undefined, id: Id, address: ShippingAddress): Promise<Order> {
    requireAdmin(actor, "manage orders");
    const order = await findOrder(this.#orders, id);
    order.changeShippingAddress(address);
    await this.#orders.save(order);
    return order;
  }
}

export class ShipOrder {
  readonly #orders: OrderRepository;

  constructor(orders: OrderRepository) {
    this.#orders = orders;
  }

  async execute(actor: Actor | undefined, id: Id, shipment: Shipment): Promise<Order> {
    requireAdmin(actor, "manage orders");
    const order = await findOrder(this.#orders, id);
    order.ship(shipment);
    await this.#orders.save(order);
    return order;
  }
}

export class CloseOrder {
  readonly #orders: OrderRepository;

  constructor(orders: OrderRepository) {
    this.#orders = orders;
  }

  async execute(actor: Actor | undefined, id: Id, outcome: "DELIVERED" | "LOST"): Promise<Order> {
    requireAdmin(actor, "manage orders");
    const order = await findOrder(this.#orders, id);
    if (outcome === "DELIVERED") {
      order.deliver();
    } else {
      order.markLost();
    }
    await this.#orders.save(order);
    return order;
  }
}
