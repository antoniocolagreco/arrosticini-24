import type { Id } from "@arrosticini/kernel";
import type { User } from "./user.js";

export interface UserRepository {
  findById(id: Id): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  create(user: User): Promise<void>;
  save(user: User): Promise<void>;
}
