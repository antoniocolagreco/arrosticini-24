import type { Id } from "@arrosticini/kernel";
import type { Payment } from "./payment.js";

export interface PaymentRepository {
  findByOrderId(orderId: Id): Promise<Payment | undefined>;
  save(payment: Payment): Promise<void>;
}
