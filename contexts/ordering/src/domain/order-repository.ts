import type { Id } from "@arrosticini/kernel";
import type { Order } from "./order.js";

export interface OrderRepository {
  findById(id: Id): Promise<Order | undefined>;
  listByUser(userId: Id): Promise<Order[]>;
  listAll(): Promise<Order[]>;
  create(order: Order): Promise<void>;
  save(order: Order): Promise<void>;
}
