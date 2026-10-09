import type { Id } from "@arrosticini/kernel";
import type { User } from "./user.js";

export interface UserRepository {
  findById(id: Id): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  listAll(): Promise<User[]>;
  create(user: User): Promise<void>;
  save(user: User): Promise<void>;
}
