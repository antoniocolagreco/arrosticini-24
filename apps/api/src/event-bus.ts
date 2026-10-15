import type { DomainEvent, EventBus, EventHandler } from "@arrosticini/kernel";

export class InProcessEventBus implements EventBus {
  readonly #handlers = new Map<string, EventHandler<DomainEvent>[]>();

  subscribe<TEvent extends DomainEvent>(type: TEvent["type"], handler: EventHandler<TEvent>): void {
    this.#handlers.set(type, [
      ...(this.#handlers.get(type) ?? []),
      handler as EventHandler<DomainEvent>,
    ]);
  }

  async publish(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      for (const handler of this.#handlers.get(event.type) ?? []) {
        await handler(event);
      }
    }
  }
}
