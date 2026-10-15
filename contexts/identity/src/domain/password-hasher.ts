export interface PasswordHash {
  readonly hash: string;
  readonly salt: string;
}

export interface PasswordHasher {
  hash(password: string): Promise<PasswordHash>;
  verify(password: string, stored: PasswordHash): Promise<boolean>;
}
