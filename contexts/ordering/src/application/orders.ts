import { DomainError, type Id, newId } from "@arrosticini/kernel";
import { Order, type OrderLine } from "../domain/order.js";
import type { OrderRepository } from "../domain/order-repository.js";
import { type Actor, requireActor } from "./actor.js";
import type { CartReader, CatalogPricing, CustomerDirectory } from "./ports.js";

export interface PlaceOrderCommand {
  cartId: Id;
  addressId: Id;
}

export class PlaceOrder {
  readonly #orders: OrderRepository;
  readonly #carts: CartReader;
  readonly #pricing: CatalogPricing;
  readonly #customers: CustomerDirectory;

  constructor(
    orders: OrderRepository,
    carts: CartReader,
    pricing: CatalogPricing,
    customers: CustomerDirectory,
  ) {
    this.#orders = orders;
    this.#carts = carts;
    this.#pricing = pricing;
    this.#customers = customers;
  }

  async execute(
    actor: Actor | undefined,
    { cartId, addressId }: PlaceOrderCommand,
  ): Promise<Order> {
    const buyer = requireActor(actor);
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
    return order;
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

  async execute(actor: Actor | undefined): Promise<Order[]> {
    if (requireActor(actor).role !== "admin") {
      throw new DomainError("FORBIDDEN", "Only admins can list all orders");
    }
    return this.#orders.listAll();
  }
}
