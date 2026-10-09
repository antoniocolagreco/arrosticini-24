export interface ProcessedEventRepository {
  has(eventId: string): Promise<boolean>;
  add(eventId: string, now: Date): Promise<void>;
}
