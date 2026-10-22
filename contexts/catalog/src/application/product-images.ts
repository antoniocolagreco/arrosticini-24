import { DomainError, type Id, newId } from "@arrosticini/kernel";
import { detectImageType, IMAGE_EXTENSIONS } from "../domain/image-type.js";
import type { Product } from "../domain/product.js";
import type { ProductRepository } from "../domain/product-repository.js";
import type { Actor } from "./actor.js";
import type { ImageStorage, StoredImage } from "./image-storage.js";
import { loadProductForAdmin } from "./load-product.js";

export class AddProductImage {
  readonly #products: ProductRepository;
  readonly #images: ImageStorage;

  constructor(products: ProductRepository, images: ImageStorage) {
    this.#products = products;
    this.#images = images;
  }

  async execute(actor: Actor | undefined, slug: string, bytes: Uint8Array): Promise<Product> {
    const product = await loadProductForAdmin(this.#products, actor, slug);
    const type = detectImageType(bytes);
    if (type === undefined) {
      throw new DomainError("INVALID_IMAGE", "The file is not a JPEG, PNG or WebP image");
    }
    const id = newId();
    const key = `products/${slug}/${id}.${IMAGE_EXTENSIONS[type]}`;
    await this.#images.put(key, bytes, type);
    product.addImage({ id, key }, new Date());
    await this.#products.save(product);
    return product;
  }
}

export class GetProductImage {
  readonly #images: ImageStorage;

  constructor(images: ImageStorage) {
    this.#images = images;
  }

  async execute(slug: string, fileName: string): Promise<StoredImage> {
    const image = await this.#images.get(`products/${slug}/${fileName}`);
    if (image === undefined) {
      throw new DomainError("PRODUCT_IMAGE_NOT_FOUND", `Image not found: ${fileName}`);
    }
    return image;
  }
}

export class RemoveProductImage {
  readonly #products: ProductRepository;
  readonly #images: ImageStorage;

  constructor(products: ProductRepository, images: ImageStorage) {
    this.#products = products;
    this.#images = images;
  }

  async execute(actor: Actor | undefined, slug: string, imageId: Id): Promise<Product> {
    const product = await loadProductForAdmin(this.#products, actor, slug);
    const { key } = product.removeImage(imageId, new Date());
    await this.#products.save(product);
    await this.#images.delete(key);
    return product;
  }
}
