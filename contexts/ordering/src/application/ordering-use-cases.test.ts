import { DomainError, type Id, localizedText, Money } from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { Order } from "../domain/order.js";
import type { OrderRepository } from "../domain/order-repository.js";
import type { Actor } from "./actor.js";
import {
  CancelOrder,
  ChangeShippingAddress,
  CloseOrder,
  GetOrder,
  ListAllOrders,
  ListOrders,
  MarkOrderPaid,
  PlaceOrder,
  ShipOrder,
} from "./orders.js";
import type {
  CartReader,
  CartSnapshot,
  CatalogPricing,
  CustomerDirectory,
  PaymentInitiator,
  PaymentRequest,
} from "./ports.js";

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

  async save(order: Order) {
    this.orders.set(order.id, order);
  }
}

class RecordingPaymentInitiator implements PaymentInitiator {
  readonly requests: [Actor, PaymentRequest][] = [];

  async start(actor: Actor, request: PaymentRequest) {
    this.requests.push([actor, request]);
    return `https://checkout.stripe.test/${request.orderId}`;
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

const checkout = { locale: "it", ordersUrl: "https://shop.test/it/orders" } as const;

function placeOrder(orders: OrderRepository, payments = new RecordingPaymentInitiator()) {
  return new PlaceOrder(orders, cartReader, pricing, customers, payments);
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

    const { order } = await placeOrder(orders).execute(mario, {
      cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0M",
      ...checkout,
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

  it("starts the payment and returns its URL", async () => {
    const payments = new RecordingPaymentInitiator();

    const { order, paymentUrl } = await placeOrder(new InMemoryOrderRepository(), payments).execute(
      mario,
      {
        cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0M",
        locale: "en",
        ordersUrl: "https://shop.test/en/orders/",
      },
    );

    expect(paymentUrl).toBe(`https://checkout.stripe.test/${order.id}`);
    expect(payments.requests).toEqual([
      [
        mario,
        {
          orderId: order.id,
          lines: order.lines,
          locale: "en",
          returnUrl: `https://shop.test/en/orders/${order.id}`,
        },
      ],
    ]);
  });

  it("requires a signed-in user", async () => {
    await expect(
      placeOrder(new InMemoryOrderRepository()).execute(undefined, {
        cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0M",
        ...checkout,
      }),
    ).rejects.toEqual(new DomainError("UNAUTHORIZED", "Authentication required"));
  });

  it("forbids admins", async () => {
    const orders = new InMemoryOrderRepository();
    const payments = new RecordingPaymentInitiator();

    await expect(
      placeOrder(orders, payments).execute(admin, {
        cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0M",
        ...checkout,
      }),
    ).rejects.toEqual(new DomainError("FORBIDDEN", "Admins cannot place orders"));
    expect(orders.orders.size).toBe(0);
    expect(payments.requests).toEqual([]);
  });

  it.each([
    ["an unknown cart", "01JB2Q7Z8X4M3N5P6R7S8T9V0E"],
    ["an anonymous cart", "01JB2Q7Z8X4M3N5P6R7S8T9V0B"],
  ])("answers CART_NOT_FOUND for %s", async (_case, cartId) => {
    await expect(
      placeOrder(new InMemoryOrderRepository()).execute(mario, {
        cartId,
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0M",
        ...checkout,
      }),
    ).rejects.toEqual(new DomainError("CART_NOT_FOUND", `Cart not found: ${cartId}`));
  });

  it("answers CART_NOT_FOUND for the cart of another user", async () => {
    await expect(
      placeOrder(new InMemoryOrderRepository()).execute(lucia, {
        cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0M",
        ...checkout,
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
        ...checkout,
      }),
    ).rejects.toMatchObject({ code: "CART_EMPTY" });
  });

  it("answers ADDRESS_NOT_FOUND for an address the user does not have", async () => {
    await expect(
      placeOrder(new InMemoryOrderRepository()).execute(mario, {
        cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0N",
        ...checkout,
      }),
    ).rejects.toEqual(
      new DomainError("ADDRESS_NOT_FOUND", "Address not found: 01JB2Q7Z8X4M3N5P6R7S8T9V0N"),
    );
  });

  it("answers PRODUCT_UNAVAILABLE when a product is no longer on sale", async () => {
    const orders = new InMemoryOrderRepository();
    const payments = new RecordingPaymentInitiator();

    await expect(
      placeOrder(orders, payments).execute(mario, {
        cartId: "01JB2Q7Z8X4M3N5P6R7S8T9V0D",
        addressId: "01JB2Q7Z8X4M3N5P6R7S8T9V0M",
        ...checkout,
      }),
    ).rejects.toEqual(new DomainError("PRODUCT_UNAVAILABLE", "Product unavailable: carbone"));
    expect(orders.orders.size).toBe(0);
    expect(payments.requests).toEqual([]);
  });
});

describe("MarkOrderPaid", () => {
  it("marks a pending order as paid and ignores repeated events", async () => {
    const orders = new InMemoryOrderRepository();
    const order = stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0F", mario.userId);

    await new MarkOrderPaid(orders).execute(order.id);
    const paidAt = order.paidAt;
    await new MarkOrderPaid(orders).execute(order.id);

    expect(order.status).toBe("PAID");
    expect(paidAt).toBeInstanceOf(Date);
    expect(order.paidAt).toBe(paidAt);
  });

  it("ignores unknown orders", async () => {
    await expect(
      new MarkOrderPaid(new InMemoryOrderRepository()).execute("01JB2Q7Z8X4M3N5P6R7S8T9V0H"),
    ).resolves.toBeUndefined();
  });

  it("ignores a repeated event after the order has shipped", async () => {
    const orders = new InMemoryOrderRepository();
    const order = stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0F", mario.userId);
    order.markPaid(new Date("2026-10-09T10:05:00.000Z"));
    order.ship({ carrier: "BRT", trackingNumber: "BRT0001" });

    await new MarkOrderPaid(orders).execute(order.id);

    expect(order.status).toBe("SHIPPED");
    expect(order.paidAt).toEqual(new Date("2026-10-09T10:05:00.000Z"));
  });
});

describe("CancelOrder", () => {
  it("cancels a pending order and ignores repeated events", async () => {
    const orders = new InMemoryOrderRepository();
    const order = stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0F", mario.userId);

    await new CancelOrder(orders).execute(order.id);
    await new CancelOrder(orders).execute(order.id);

    expect(order.status).toBe("CANCELLED");
  });

  it("refuses to cancel a paid order", async () => {
    const orders = new InMemoryOrderRepository();
    const order = stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0F", mario.userId);
    order.markPaid(new Date("2026-10-09T10:05:00.000Z"));

    await expect(new CancelOrder(orders).execute(order.id)).rejects.toMatchObject({
      code: "ORDER_INVALID_TRANSITION",
    });
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

  it("lists the orders of one user", async () => {
    const orders = new InMemoryOrderRepository();
    stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0F", mario.userId);
    stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0G", lucia.userId);

    const listed = await new ListAllOrders(orders).execute(admin, lucia.userId);

    expect(listed.map(({ id }) => id)).toEqual(["01JB2Q7Z8X4M3N5P6R7S8T9V0G"]);
  });
});

describe("order administration", () => {
  const newAddress = {
    fullName: "Lucia Rossi",
    line1: "Via Arniense 21",
    city: "Chieti",
    postalCode: "66100",
    country: "IT",
    phone: "+39 333 0000006",
  };

  it("changes the address, ships and closes an order", async () => {
    const orders = new InMemoryOrderRepository();
    const order = stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0F", mario.userId);
    order.markPaid(new Date("2026-10-09T10:05:00.000Z"));

    await new ChangeShippingAddress(orders).execute(admin, order.id, newAddress);
    await new ShipOrder(orders).execute(admin, order.id, {
      carrier: "BRT",
      trackingNumber: "BRT0001",
    });
    const closed = await new CloseOrder(orders).execute(admin, order.id, "DELIVERED");

    expect(closed.shippingAddress).toEqual(newAddress);
    expect(closed.shipment).toEqual({ carrier: "BRT", trackingNumber: "BRT0001" });
    expect(closed.status).toBe("DELIVERED");
    expect(orders.orders.get(order.id)).toBe(closed);
  });

  it("marks a shipped order as lost", async () => {
    const orders = new InMemoryOrderRepository();
    const order = stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0F", mario.userId);
    order.markPaid(new Date("2026-10-09T10:05:00.000Z"));
    order.ship({ carrier: "BRT", trackingNumber: "BRT0001" });

    expect((await new CloseOrder(orders).execute(admin, order.id, "LOST")).status).toBe("LOST");
  });

  it("is reserved to admins", async () => {
    const orders = new InMemoryOrderRepository();
    const order = stored(orders, "01JB2Q7Z8X4M3N5P6R7S8T9V0F", mario.userId);

    await expect(
      new ChangeShippingAddress(orders).execute(mario, order.id, newAddress),
    ).rejects.toEqual(new DomainError("FORBIDDEN", "Only admins can manage orders"));
    await expect(
      new ShipOrder(orders).execute(mario, order.id, { carrier: "BRT", trackingNumber: "BRT0001" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(new CloseOrder(orders).execute(undefined, order.id, "LOST")).rejects.toMatchObject(
      { code: "UNAUTHORIZED" },
    );
    expect(order.shippingAddress).toEqual(marioAddress);
  });

  it("answers ORDER_NOT_FOUND for an unknown order", async () => {
    await expect(
      new ShipOrder(new InMemoryOrderRepository()).execute(admin, "01JB2Q7Z8X4M3N5P6R7S8T9V0H", {
        carrier: "BRT",
        trackingNumber: "BRT0001",
      }),
    ).rejects.toEqual(
      new DomainError("ORDER_NOT_FOUND", "Order not found: 01JB2Q7Z8X4M3N5P6R7S8T9V0H"),
    );
  });
});
