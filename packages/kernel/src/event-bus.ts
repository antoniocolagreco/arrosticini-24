import type { DomainEvent } from "./domain-event.js";

export type EventHandler<TEvent extends DomainEvent> = (event: TEvent) => Promise<void>;

export interface EventBus {
  publish(events: readonly DomainEvent[]): Promise<void>;
  subscribe<TEvent extends DomainEvent>(type: TEvent["type"], handler: EventHandler<TEvent>): void;
}
