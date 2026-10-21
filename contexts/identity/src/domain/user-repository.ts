import type { Id, Page, PageRequest } from "@arrosticini/kernel";
import type { User, UserStatus } from "./user.js";

export interface UserRepository {
  findById(id: Id): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  listAll(page: PageRequest): Promise<Page<User>>;
  listByStatus(status: UserStatus, page: PageRequest): Promise<Page<User>>;
  create(user: User): Promise<void>;
  save(user: User): Promise<void>;
}
