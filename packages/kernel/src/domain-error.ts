export class DomainError extends Error {
  override readonly name = "DomainError";
  readonly code: string;

  constructor(code: string, message: string = code) {
    super(message);
    this.code = code;
  }
}
