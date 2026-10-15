import { DomainError, localizedText, Money } from "@arrosticini/kernel";
import { describe, expect, it } from "vitest";
import { Product, type ProductStatus } from "../domain/product.js";
import type { ProductRepository, ProductSearch } from "../domain/product-repository.js";
import type { Actor } from "./actor.js";
import { CreateProduct } from "./create-product.js";
import { GetProduct } from "./get-product.js";
import type { ImageStorage } from "./image-storage.js";
import { ListProducts } from "./list-products.js";
import { AddProductImage, RemoveProductImage } from "./product-images.js";
import { UpdateProduct } from "./update-product.js";

class InMemoryProductRepository implements ProductRepository {
  readonly products: Product[];
  lastSearch: ProductSearch | undefined;

  constructor(products: Product[]) {
    this.products = products;
  }

  async findBySlug(slug: string) {
    return this.products.find((product) => product.slug === slug);
  }

  async search(criteria: ProductSearch) {
    this.lastSearch = criteria;
    return this.products.filter(
      (product) =>
        (criteria.status === undefined || product.status === criteria.status) &&
        (criteria.text === undefined || product.searchText.includes(criteria.text)),
    );
  }

  async create(product: Product) {
    this.products.push(product);
  }

  async save(product: Product) {
    this.saved.push(product.slug);
  }

  readonly saved: string[] = [];
}

class RecordingImageStorage implements ImageStorage {
  readonly stored: { key: string; contentType: string; size: number }[] = [];
  readonly deleted: string[] = [];

  async put(key: string, body: Uint8Array, contentType: string) {
    this.stored.push({ key, contentType, size: body.length });
  }

  async delete(key: string) {
    this.deleted.push(key);
  }
}

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

function product(slug: string, priceCents: number, status: ProductStatus): Product {
  return Product.create(
    {
      slug,
      name: localizedText({ it: slug, en: slug }),
      description: localizedText({ it: `Descrizione ${slug}`, en: `Description ${slug}` }),
      price: Money.ofCents(priceCents),
      images: [],
      status,
    },
    new Date("2026-10-08T10:00:00.000Z"),
  );
}

const admin: Actor = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0W", role: "admin" };
const customer: Actor = { userId: "01JB2Q7Z8X4M3N5P6R7S8T9V0X", role: "customer" };

function repository() {
  return new InMemoryProductRepository([
    product("fornacella", 10000, "ACTIVE"),
    product("vino", 500, "ACTIVE"),
    product("carbone", 2000, "DRAFT"),
    product("cuoco", 5000, "ARCHIVED"),
  ]);
}

describe("ListProducts", () => {
  it("shows only active products to anonymous users, cheapest first", async () => {
    const products = await new ListProducts(repository()).execute(undefined, {});

    expect(products.map(({ slug }) => slug)).toEqual(["vino", "fornacella"]);
  });

  it("shows every product to admins", async () => {
    const products = await new ListProducts(repository()).execute(admin, {});

    expect(products.map(({ slug }) => slug)).toEqual(["vino", "carbone", "cuoco", "fornacella"]);
  });

  it("filters by status for admins", async () => {
    const products = await new ListProducts(repository()).execute(admin, { status: "DRAFT" });

    expect(products.map(({ slug }) => slug)).toEqual(["carbone"]);
  });

  it("forbids the status filter to customers", async () => {
    await expect(
      new ListProducts(repository()).execute(customer, { status: "DRAFT" }),
    ).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
  });

  it("searches with a normalized query", async () => {
    const products = repository();

    await new ListProducts(products).execute(undefined, { q: " VINÒ " });

    expect(products.lastSearch).toEqual({ text: "vino", status: "ACTIVE" });
  });

  it("ignores an empty query", async () => {
    const products = repository();

    await new ListProducts(products).execute(undefined, { q: "  " });

    expect(products.lastSearch).toEqual({ status: "ACTIVE" });
  });
});

describe("GetProduct", () => {
  it("returns an active product", async () => {
    const found = await new GetProduct(repository()).execute(undefined, "vino");

    expect(found.slug).toBe("vino");
  });

  it.each([undefined, customer])("hides a draft product from %o", async (actor) => {
    await expect(new GetProduct(repository()).execute(actor, "carbone")).rejects.toThrow(
      DomainError,
    );
  });

  it("returns a draft product to admins", async () => {
    const found = await new GetProduct(repository()).execute(admin, "carbone");

    expect(found.slug).toBe("carbone");
  });

  it("fails on an unknown slug", async () => {
    await expect(new GetProduct(repository()).execute(admin, "pecora")).rejects.toThrow(
      expect.objectContaining({ code: "PRODUCT_NOT_FOUND" }),
    );
  });
});

describe("product administration", () => {
  it.each([
    [undefined, new DomainError("UNAUTHORIZED", "Authentication required")],
    [customer, new DomainError("FORBIDDEN", "Only admins can manage products")],
  ])("is reserved to admins, not to %o", async (actor, error) => {
    const products = repository();
    const images = new RecordingImageStorage();

    await expect(
      new CreateProduct(products).execute(actor, {
        slug: "birra",
        name: localizedText({ it: "Birra", en: "Beer" }),
        description: localizedText({ it: "Bionda", en: "Lager" }),
        priceCents: 400,
      }),
    ).rejects.toEqual(error);
    await expect(
      new UpdateProduct(products).execute(actor, "vino", { priceCents: 1 }),
    ).rejects.toEqual(error);
    await expect(new AddProductImage(products, images).execute(actor, "vino", png)).rejects.toEqual(
      error,
    );
    await expect(
      new RemoveProductImage(products, images).execute(actor, "vino", "01JB2Q7Z8X4M3N5P6R7S8T9V0A"),
    ).rejects.toEqual(error);
    expect(images.stored).toEqual([]);
    expect(products.saved).toEqual([]);
  });
});

describe("CreateProduct", () => {
  it("creates a draft product unless a status is given", async () => {
    const products = repository();

    const draft = await new CreateProduct(products).execute(admin, {
      slug: "birra",
      name: localizedText({ it: "Birra artigianale", en: "Craft beer" }),
      description: localizedText({ it: "Bionda di Chieti", en: "Lager from Chieti" }),
      priceCents: 400,
    });
    const active = await new CreateProduct(products).execute(admin, {
      slug: "arrosticini-30",
      name: localizedText({ it: "Arrosticini fatti a mano", en: "Handmade arrosticini" }),
      description: localizedText({ it: "Tagliati a coltello", en: "Hand cut" }),
      pieces: 30,
      priceCents: 2690,
      status: "ACTIVE",
    });

    expect(draft.status).toBe("DRAFT");
    expect(draft.pieces).toBeUndefined();
    expect(draft.price).toEqual(Money.ofCents(400));
    expect(draft.images).toEqual([]);
    expect(active.status).toBe("ACTIVE");
    expect(active.pieces).toBe(30);
    expect(products.products.map(({ slug }) => slug)).toContain("birra");
  });
});

describe("UpdateProduct", () => {
  it("updates and saves the product", async () => {
    const products = repository();

    const updated = await new UpdateProduct(products).execute(admin, "vino", {
      priceCents: 650,
      status: "ARCHIVED",
    });

    expect(updated.price).toEqual(Money.ofCents(650));
    expect(updated.status).toBe("ARCHIVED");
    expect(products.saved).toEqual(["vino"]);
  });

  it("fails on an unknown slug", async () => {
    await expect(
      new UpdateProduct(repository()).execute(admin, "pecora", { priceCents: 1 }),
    ).rejects.toEqual(new DomainError("PRODUCT_NOT_FOUND", "Product not found: pecora"));
  });
});

describe("AddProductImage", () => {
  it("stores the image under the product with the extension of its real type", async () => {
    const products = repository();
    const images = new RecordingImageStorage();

    const updated = await new AddProductImage(products, images).execute(admin, "vino", png);

    expect(updated.images).toEqual([
      { id: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{26}$/), key: expect.any(String) },
    ]);
    const [image] = updated.images;
    expect(image?.key).toBe(`products/vino/${image?.id}.png`);
    expect(images.stored).toEqual([{ key: image?.key, contentType: "image/png", size: 10 }]);
    expect(products.saved).toEqual(["vino"]);
  });

  it("rejects a file that is not an image", async () => {
    const products = repository();
    const images = new RecordingImageStorage();

    await expect(
      new AddProductImage(products, images).execute(
        admin,
        "vino",
        new TextEncoder().encode("<svg></svg>"),
      ),
    ).rejects.toEqual(
      new DomainError("INVALID_IMAGE", "The file is not a JPEG, PNG or WebP image"),
    );
    expect(images.stored).toEqual([]);
    expect(products.saved).toEqual([]);
  });
});

describe("RemoveProductImage", () => {
  it("removes the image from the product and from the storage", async () => {
    const products = repository();
    const images = new RecordingImageStorage();
    const { images: added } = await new AddProductImage(products, images).execute(
      admin,
      "vino",
      png,
    );
    const [image] = added;

    const updated = await new RemoveProductImage(products, images).execute(
      admin,
      "vino",
      image?.id ?? "",
    );

    expect(updated.images).toEqual([]);
    expect(images.deleted).toEqual([image?.key]);
  });

  it("fails on an unknown image without touching the storage", async () => {
    const images = new RecordingImageStorage();

    await expect(
      new RemoveProductImage(repository(), images).execute(
        admin,
        "vino",
        "01JB2Q7Z8X4M3N5P6R7S8T9V0A",
      ),
    ).rejects.toEqual(
      new DomainError("PRODUCT_IMAGE_NOT_FOUND", "Image not found: 01JB2Q7Z8X4M3N5P6R7S8T9V0A"),
    );
    expect(images.deleted).toEqual([]);
  });
});
