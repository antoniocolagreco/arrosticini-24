import { DomainError, type Id, type LocalizedText, type Money } from "@arrosticini/kernel";

export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface ProductImage {
  readonly id: Id;
  readonly key: string;
}

export interface ProductProps {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  pieces?: number;
  price: Money;
  images: readonly ProductImage[];
  status: ProductStatus;
  updatedAt: Date;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export class Product {
  readonly #props: ProductProps;

  private constructor(props: ProductProps) {
    this.#props = props;
  }

  static create(props: Omit<ProductProps, "updatedAt">, now: Date): Product {
    if (props.slug.length > 64 || !SLUG_PATTERN.test(props.slug)) {
      throw new DomainError("INVALID_PRODUCT_SLUG", `Invalid slug: ${props.slug}`);
    }
    if (props.pieces !== undefined && (!Number.isSafeInteger(props.pieces) || props.pieces < 1)) {
      throw new DomainError("INVALID_PRODUCT_PIECES", `Invalid pieces: ${props.pieces}`);
    }
    return new Product({ ...props, updatedAt: now });
  }

  static restore(props: ProductProps): Product {
    return new Product(props);
  }

  get slug(): string {
    return this.#props.slug;
  }

  get name(): LocalizedText {
    return this.#props.name;
  }

  get description(): LocalizedText {
    return this.#props.description;
  }

  get pieces(): number | undefined {
    return this.#props.pieces;
  }

  get price(): Money {
    return this.#props.price;
  }

  get images(): readonly ProductImage[] {
    return this.#props.images;
  }

  get status(): ProductStatus {
    return this.#props.status;
  }

  get updatedAt(): Date {
    return this.#props.updatedAt;
  }

  get searchText(): string {
    const { name, description } = this.#props;
    return normalizeSearchText([name.it, name.en, description.it, description.en].join(" "));
  }
}
