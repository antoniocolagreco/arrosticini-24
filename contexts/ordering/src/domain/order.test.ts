import { DomainError, localizedText, Money } from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { Order, type OrderLine } from "./order.js";

const placed = new Date("2026-10-09T10:00:00.000Z");
const paid = new Date("2026-10-09T10:05:00.000Z");

const lines: OrderLine[] = [
  {
    slug: "arrosticini-50",
    name: localizedText({ it: "Arrosticini classici", en: "Classic arrosticini" }),
    unitPrice: Money.ofCents(2990),
    quantity: 2,
  },
  {
    slug: "vino",
    name: localizedText({ it: "Montepulciano", en: "Montepulciano" }),
    unitPrice: Money.ofCents(890),
    quantity: 1,
  },
];

const shippingAddress = {
  fullName: "Mario Rossi",
  line1: "Via Collegrande 10",
  city: "Chieti",
  postalCode: "66100",
  country: "IT",
  phone: "+39 0871 000000",
};

function place(): Order {
  return Order.place(
    {
      id: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
      lines,
      shippingAddress,
    },
    placed,
  );
}

describe("Order", () => {
  it("is placed waiting for payment with the total of its lines", () => {
    const order = place();

    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.createdAt).toEqual(placed);
    expect(order.paidAt).toBeUndefined();
    expect(order.total).toEqual(Money.ofCents(6870));
  });

  it("cannot be placed without lines", () => {
    expect(() =>
      Order.place(
        {
          id: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
          userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
          lines: [],
          shippingAddress,
        },
        placed,
      ),
    ).toThrow(new DomainError("CART_EMPTY", "Order 01JB2Q7Z8X4M3N5P6R7S8T9V0A has no lines"));
  });

  it.each([0, -1, 1.5])("rejects quantity %o", (quantity) => {
    expect(() =>
      Order.place(
        {
          id: "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
          userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X",
          lines: [
            {
              slug: "arrosticini-50",
              name: localizedText({ it: "Arrosticini classici", en: "Classic arrosticini" }),
              unitPrice: Money.ofCents(2990),
              quantity,
            },
          ],
          shippingAddress,
        },
        placed,
      ),
    ).toThrow(
      new DomainError("INVALID_QUANTITY", `Invalid quantity for arrosticini-50: ${quantity}`),
    );
  });

  it("goes from pending to paid", () => {
    const order = place();

    order.markPaid(paid);

    expect(order.status).toBe("PAID");
    expect(order.paidAt).toEqual(paid);
  });

  it("goes from pending to cancelled", () => {
    const order = place();

    order.cancel();

    expect(order.status).toBe("CANCELLED");
  });

  it("forbids any other transition", () => {
    const paidOrder = place();
    paidOrder.markPaid(paid);
    const cancelledOrder = place();
    cancelledOrder.cancel();

    expect(() => paidOrder.cancel()).toThrow(
      new DomainError(
        "ORDER_INVALID_TRANSITION",
        "Order 01JB2Q7Z8X4M3N5P6R7S8T9V0A cannot go from PAID to CANCELLED",
      ),
    );
    expect(() => paidOrder.markPaid(paid)).toThrow(
      new DomainError(
        "ORDER_INVALID_TRANSITION",
        "Order 01JB2Q7Z8X4M3N5P6R7S8T9V0A cannot go from PAID to PAID",
      ),
    );
    expect(() => cancelledOrder.markPaid(paid)).toThrow(
      new DomainError(
        "ORDER_INVALID_TRANSITION",
        "Order 01JB2Q7Z8X4M3N5P6R7S8T9V0A cannot go from CANCELLED to PAID",
      ),
    );
  });

  it("is shipped after payment, with tracking added later", () => {
    const order = place();
    order.markPaid(paid);

    order.ship({ carrier: "BRT" });
    expect(order.status).toBe("SHIPPED");
    expect(order.shipment).toEqual({ carrier: "BRT" });

    order.ship({
      carrier: "GLS",
      trackingNumber: "GLS0001",
      trackingUrl: "https://gls-group.com/IT/it/servizi-online/ricerca-spedizioni?match=GLS0001",
    });

    expect(order.status).toBe("SHIPPED");
    expect(order.shipment).toEqual({
      carrier: "GLS",
      trackingNumber: "GLS0001",
      trackingUrl: "https://gls-group.com/IT/it/servizi-online/ricerca-spedizioni?match=GLS0001",
    });
  });

  it("is closed as delivered or lost only after shipping", () => {
    const delivered = place();
    delivered.markPaid(paid);
    delivered.ship({ carrier: "BRT", trackingNumber: "BRT0001" });
    const lost = place();
    lost.markPaid(paid);
    lost.ship({ carrier: "BRT", trackingNumber: "BRT0002" });

    delivered.deliver();
    lost.markLost();

    expect([delivered.status, lost.status]).toEqual(["DELIVERED", "LOST"]);
    expect(() => delivered.markLost()).toThrow(
      new DomainError(
        "ORDER_INVALID_TRANSITION",
        "Order 01JB2Q7Z8X4M3N5P6R7S8T9V0A cannot go from DELIVERED to LOST",
      ),
    );
  });

  it("keeps the shipment editable after the order is closed", () => {
    const delivered = place();
    delivered.markPaid(paid);
    delivered.ship({ carrier: "BRT" });
    delivered.deliver();
    const lost = place();
    lost.markPaid(paid);
    lost.ship({ carrier: "BRT" });
    lost.markLost();

    delivered.ship({ carrier: "BRT", trackingNumber: "BRT0001" });
    lost.ship({ carrier: "SDA", trackingNumber: "SDA0001" });

    expect([delivered.status, lost.status]).toEqual(["DELIVERED", "LOST"]);
    expect(delivered.shipment).toEqual({ carrier: "BRT", trackingNumber: "BRT0001" });
    expect(lost.shipment).toEqual({ carrier: "SDA", trackingNumber: "SDA0001" });
  });

  it("cannot be shipped once cancelled", () => {
    const order = place();
    order.cancel();

    expect(() => order.ship({ carrier: "BRT" })).toThrow(
      new DomainError(
        "ORDER_INVALID_TRANSITION",
        "Order 01JB2Q7Z8X4M3N5P6R7S8T9V0A cannot go from CANCELLED to SHIPPED",
      ),
    );
  });

  it("cannot be shipped or closed before payment", () => {
    const order = place();

    expect(() => order.ship({ carrier: "BRT", trackingNumber: "BRT0001" })).toThrow(
      new DomainError(
        "ORDER_INVALID_TRANSITION",
        "Order 01JB2Q7Z8X4M3N5P6R7S8T9V0A cannot go from PENDING_PAYMENT to SHIPPED",
      ),
    );
    expect(() => order.deliver()).toThrow(
      new DomainError(
        "ORDER_INVALID_TRANSITION",
        "Order 01JB2Q7Z8X4M3N5P6R7S8T9V0A cannot go from PENDING_PAYMENT to DELIVERED",
      ),
    );
  });

  it("changes the shipping address only until it is shipped", () => {
    const order = place();
    const newAddress = {
      fullName: "Lucia Rossi",
      line1: "Via Arniense 21",
      line2: "Scala A",
      city: "Chieti",
      postalCode: "66100",
      country: "IT",
      phone: "+39 333 0000006",
    };

    order.changeShippingAddress(newAddress);
    order.markPaid(paid);
    order.changeShippingAddress(shippingAddress);
    order.ship({ carrier: "BRT", trackingNumber: "BRT0001" });

    expect(order.shippingAddress).toEqual(shippingAddress);
    expect(() => order.changeShippingAddress(newAddress)).toThrow(
      new DomainError(
        "ORDER_NOT_EDITABLE",
        "Order 01JB2Q7Z8X4M3N5P6R7S8T9V0A cannot change address when SHIPPED",
      ),
    );
  });
});
