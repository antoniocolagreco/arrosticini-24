import type { Id, Page, PageRequest } from "@arrosticini/kernel";
import type { Order, OrderStatus } from "./order.js";

export interface OrderRepository {
  findById(id: Id): Promise<Order | undefined>;
  listByUser(userId: Id, page: PageRequest): Promise<Page<Order>>;
  listByStatus(status: OrderStatus, page: PageRequest): Promise<Page<Order>>;
  listAll(page: PageRequest): Promise<Page<Order>>;
  create(order: Order): Promise<void>;
  save(order: Order): Promise<void>;
}
