import { DomainError, type Id, localizedText, Money } from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { Order } from "../domain/order.js";
import type { OrderRepository } from "../domain/order-repository.js";
import type { Actor } from "./actor.js";
import { GetOrder, ListAllOrders, ListOrders, PlaceOrder } from "./orders.js";
import type { CartReader, CartSnapshot, CatalogPricing, CustomerDirectory } from "./ports.js";

class InMemoryOrderRepository implements OrderRepository {
  readonly orders = new Map<Id, Order>();

  async findById(id: Id) {
    return this.orders.get(id);
  }

  async listByUser(userId: Id) {
    return [...this.orders.values()].filter((order) => order.userId === userId);
  }

  async listAll() {
    return [...this.orders.values()];
  }

  async create(order: Order) {
    this.orders.set(order.id, order);
  }
}

const mario: Actor = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X", role: "customer" };
const lucia: Actor = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Y", role: "customer" };
const admin: Actor = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0Z", role: "admin" };

const marioAddress = {
  fullName: "Mario Rossi",
  line1: "Via Collegrande 10",
  city: "Chieti",
  postalCode: "66100",
  country: "IT",
  phone: "+39 0871 000000",
};

const carts: Record<Id, CartSnapshot> = {
  "01JB2Q7Z8X4M3N5P6R7S8T9V0A": {
    ownerId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
    lines: [
      { slug: "arrosticini-50", quantity: 2 },
      { slug: "vino", quantity: 1 },
    ],
  },
  "01JB2Q7Z8X4M3N5P6R7S8T9V0B": { ownerId: undefined, lines: [{ slug: "vino", quantity: 1 }] },
  "01JB2Q7Z8X4M3N5P6R7S8T9V0C": { ownerId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X", lines: [] },
  "01JB2Q7Z8X4M3N5P6R7S8T9V0D": {
    ownerId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
    lines: [{ slug: "carbone", quantity: 1 }],
  },
};

const cartReader: CartReader = { find: async (cartId) => carts[cartId] };

const pricing: CatalogPricing = {
  price: async (slug) =>
    ({
      "arrosticini-50": {
        name: localizedText({ it: "Arrosticini classici", en: "Classic arrosticini" }),
        unitPrice: Money.ofCents(2990),
      },
      vino: {
        name: localizedText({ it: "Montepulciano", en: "Montepulciano" }),
        unitPrice: Money.ofCents(890),
      },
    })[slug],
};

const customers: CustomerDirectory = {
  shippingAddress: async (actor, addressId) =>
    actor.userId === mario.userId && addressId === "01JB2Q7Z8X4M3N5P6R7S8T9V0M"
      ? marioAddress
      : undefined,
};

function placeOrder(orders: OrderRepository) {
  return new PlaceOrder(orders, cartReader, pricing, customers);
}

function stored(orders: InMemoryOrderRepository, id: Id, userId: Id): Order {
  const order = Order.place(
    {
      id,
      userId,
      lines: [
        {
          slug: "vino",
          name: localizedText({ it: "Montepulciano", en: "Montepulciano" }),
          unitPrice: Money.ofCents(890),
          quantity: 1,
        },
      ],
      shippingAddress: marioAddress,
    },
    new Date("2026-10-09T10:00:00.000Z"),
  );
  orders.orders.set(id, order);
  return order;
}

describe("PlaceOrder", () => {
  it("creates a pending order with server prices and a copy of the address", async () => {
    const orders = new InMemoryOrderRepository();

    const order = await placeOrder(orders).execute(mario, {
      cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0M",
    });

    expect(order.userId).toBe(mario.userId);
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.lines).toEqual([
      {
        slug: "arrosticini-50",
        name: { it: "Arrosticini classici", en: "Classic arrosticini" },
        unitPrice: Money.ofCents(2990),
        quantity: 2,
      },
      {
        slug: "vino",
        name: { it: "Montepulciano", en: "Montepulciano" },
        unitPrice: Money.ofCents(890),
        quantity: 1,
      },
    ]);
    expect(order.total).toEqual(Money.ofCents(6870));
    expect(order.shippingAddress).toEqual(marioAddress);
    expect(orders.orders.get(order.id)).toBe(order);
  });

  it("requires a signed-in user", async () => {
    await expect(
      placeOrder(new InMemoryOrderRepository()).execute(undefined, {
        cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0M",
      }),
    ).rejects.toEqual(new DomainError("UNAUTHORIZED", "Authentication required"));
  });

  it.each([
    ["an unknown cart", "01JB2Q7Z8X4M3N5P6R7S8T9V0E"],
    ["an anonymous cart", "01JB2Q7Z8X4M3N5P6R7S8T9V0B"],
  ])("answers CART_NOT_FOUND for %s", async (_case, cartId) => {
    await expect(
      placeOrder(new InMemoryOrderRepository()).execute(mario, {
        cartId,
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0M",
      }),
    ).rejects.toEqual(new DomainError("CART_NOT_FOUND", `Cart not found: ${cartId}`));
  });

  it("answers CART_NOT_FOUND for the cart of another user", async () => {
    await expect(
      placeOrder(new InMemoryOrderRepository()).execute(lucia, {
        cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0M",
      }),
    ).rejects.toEqual(
      new DomainError("CART_NOT_FOUND", "Cart not found: 01JB2Q7Z8X4M3N5P6R7S8T9V0A"),
    );
  });

  it("answers CART_EMPTY for an empty cart", async () => {
    await expect(
      placeOrder(new InMemoryOrderRepository()).execute(mario, {
        cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0C",
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0M",
      }),
    ).rejects.toMatchObject({ code: "CART_EMPTY" });
  });

  it("answers ADDRESS_NOT_FOUND for an address the user does not have", async () => {
    await expect(
      placeOrder(new InMemoryOrderRepository()).execute(mario, {
        cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0N",
      }),
    ).rejects.toEqual(
      new DomainError("ADDRESS_NOT_FOUND", "Address not found: 01JB2Q7Z8X4M3N5P6R7S8T9V0N"),
    );
  });

  it("answers PRODUCT_UNAVAILABLE when a product is no longer on sale", async () => {
    const orders = new InMemoryOrderRepository();

    await expect(
      placeOrder(orders).execute(mario, {
        cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0D",
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0M",
      }),
    ).rejects.toEqual(new DomainError("PRODUCT_UNAVAILABLE", "Product unavailable: carbone"));
    expect(orders.orders.size).toBe(0);
  });
});

describe("ListOrders", () => {
  it("lists only the orders of the user", async () => {
    const orders = new InMemoryOrderRepository();
    stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0F", mario.userId);
    stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0G", lucia.userId);

    const listed = await new ListOrders(orders).execute(mario);

    expect(listed.map(({ id }) => id)).toEqual(["01JB2Q7Z8X4M3N5P6R7S8T9V0F"]);
  });

  it("requires a signed-in user", async () => {
    await expect(new ListOrders(new InMemoryOrderRepository()).execute(undefined)).rejects.toEqual(
      new DomainError("UNAUTHORIZED", "Authentication required"),
    );
  });
});

describe("GetOrder", () => {
  it("returns an order to its owner and to admins", async () => {
    const orders = new InMemoryOrderRepository();
    const order = stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0F", mario.userId);

    expect(await new GetOrder(orders).execute(mario, order.id)).toBe(order);
    expect(await new GetOrder(orders).execute(admin, order.id)).toBe(order);
  });

  it.each([
    ["the order of another user", "01JB2Q7Z8X4M3N5P6R7S8T9V0F"],
    ["an unknown order", "01JB2Q7Z8X4M3N5P6R7S8T9V0H"],
  ])("answers ORDER_NOT_FOUND for %s", async (_case, id) => {
    const orders = new InMemoryOrderRepository();
    stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0F", mario.userId);

    await expect(new GetOrder(orders).execute(lucia, id)).rejects.toEqual(
      new DomainError("ORDER_NOT_FOUND", `Order not found: ${id}`),
    );
  });
});

describe("ListAllOrders", () => {
  it("lists every order for admins", async () => {
    const orders = new InMemoryOrderRepository();
    stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0F", mario.userId);
    stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0G", lucia.userId);

    const listed = await new ListAllOrders(orders).execute(admin);

    expect(listed.map(({ id }) => id)).toEqual([
      "01JB2Q7Z8X4M3N5P6R7S8T9V0F",
      "01JB2Q7Z8X4M3N5P6R7S8T9V0G",
    ]);
  });

  it("forbids customers", async () => {
    await expect(new ListAllOrders(new InMemoryOrderRepository()).execute(mario)).rejects.toEqual(
      new DomainError("FORBIDDEN", "Only admins can list all orders"),
    );
  });
});
