import { readFile } from "node:fs/promises";
import { type DynamoDbProductRepository, Product, type S3ImageStorage } from "@arrosticini/catalog";
import {
  type Credentials,
  type DynamoDbUserRepository,
  EnsureAdmin,
  ScryptPasswordHasher,
} from "@arrosticini/identity";
import { localizedText, Money, newId } from "@arrosticini/kernel";
import { seedProducts } from "./seed-products.js";

export async function seedCatalog(products: DynamoDbProductRepository, images: S3ImageStorage) {
  for (const seed of seedProducts) {
    if (await products.findBySlug(seed.slug)) {
      console.log(`product ${seed.slug} already exists`);
      continue;
    }
    const imageId = newId();
    const key = `products/${seed.slug}/${imageId}.webp`;
    const body = await readFile(new URL(`../seed/images/${seed.image}`, import.meta.url));
    await images.put(key, body, "image/webp");
    await products.create(
      Product.create(
        {
          slug: seed.slug,
          name: localizedText(seed.name),
          description: localizedText(seed.description),
          ...(seed.pieces === undefined ? {} : { pieces: seed.pieces }),
          price: Money.ofCents(seed.priceCents),
          images: [{ id: imageId, key }],
          status: seed.status,
        },
        new Date(),
      ),
    );
    console.log(`product ${seed.slug} created`);
  }
}

export async function seedAdmin(users: DynamoDbUserRepository, admin: Credentials) {
  const result = await new EnsureAdmin(users, new ScryptPasswordHasher()).execute(admin);
  console.log(`admin ${admin.email} ${result === "created" ? "created" : "already exists"}`);
}
