import { type Id, newId } from "./id.js";

export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  readonly id: Id;
  readonly type: TType;
  readonly occurredAt: string;
  readonly payload: TPayload;
}

export function domainEvent<TType extends string, TPayload>(
  type: TType,
  payload: TPayload,
): DomainEvent<TType, TPayload> {
  return { id: newId(), type, occurredAt: new Date().toISOString(), payload };
}
