export interface ProductAvailability {
  isAvailable(slug: string): Promise<boolean>;
}
