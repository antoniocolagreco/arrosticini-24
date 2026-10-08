import { oc } from "@orpc/contract";
import { z } from "zod";
import { admin, CurrencyDto, IdDto, localizedTextDto } from "./common.js";

export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const ProductSlug = z
  .string()
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const ProductStatus = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);

export const ProductImageDto = z.object({
  id: IdDto,
  key: z.string(),
});

export const ProductDto = z.object({
  slug: ProductSlug,
  name: localizedTextDto(120),
  description: localizedTextDto(2000),
  pieces: z.number().int().positive().optional(),
  priceCents: z.number().int().nonnegative(),
  currency: CurrencyDto,
  images: z.array(ProductImageDto),
  status: ProductStatus,
  updatedAt: z.iso.datetime(),
});

export type ProductSlug = z.infer<typeof ProductSlug>;
export type ProductStatus = z.infer<typeof ProductStatus>;
export type ProductImageDto = z.infer<typeof ProductImageDto>;
export type ProductDto = z.infer<typeof ProductDto>;

const productNotFound = { PRODUCT_NOT_FOUND: { status: 404 } } as const;

export const listProducts = oc
  .route({ method: "GET", path: "/catalog/products" })
  .input(
    z.object({
      q: z.string().trim().max(100).optional(),
      status: ProductStatus.optional(),
    }),
  )
  .output(z.object({ items: z.array(ProductDto) }))
  .errors({ FORBIDDEN: { status: 403 } });

export const getProduct = oc
  .route({ method: "GET", path: "/catalog/products/{slug}" })
  .input(z.object({ slug: ProductSlug }))
  .output(ProductDto)
  .errors(productNotFound);

export const createProduct = admin
  .route({ method: "POST", path: "/catalog/products", successStatus: 201 })
  .input(
    z.object({
      slug: ProductSlug,
      name: localizedTextDto(120),
      description: localizedTextDto(2000),
      pieces: z.number().int().positive().optional(),
      priceCents: z.number().int().nonnegative(),
      status: ProductStatus.optional(),
    }),
  )
  .output(ProductDto)
  .errors({ PRODUCT_SLUG_TAKEN: { status: 409 } });

export const updateProduct = admin
  .route({ method: "PATCH", path: "/catalog/products/{slug}" })
  .input(
    z.object({
      slug: ProductSlug,
      name: localizedTextDto(120).optional(),
      description: localizedTextDto(2000).optional(),
      pieces: z.number().int().positive().nullable().optional(),
      priceCents: z.number().int().nonnegative().optional(),
      status: ProductStatus.optional(),
    }),
  )
  .output(ProductDto)
  .errors(productNotFound);

export const addProductImage = admin
  .route({ method: "POST", path: "/catalog/products/{slug}/images", successStatus: 201 })
  .input(
    z.object({
      slug: ProductSlug,
      file: z
        .file()
        .max(PRODUCT_IMAGE_MAX_BYTES)
        .mime([...PRODUCT_IMAGE_TYPES]),
    }),
  )
  .output(ProductDto)
  .errors({ ...productNotFound, INVALID_IMAGE: { status: 422 } });

export const removeProductImage = admin
  .route({ method: "DELETE", path: "/catalog/products/{slug}/images/{imageId}" })
  .input(z.object({ slug: ProductSlug, imageId: IdDto }))
  .output(ProductDto)
  .errors({ ...productNotFound, PRODUCT_IMAGE_NOT_FOUND: { status: 404 } });

export const catalogContract = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  addProductImage,
  removeProductImage,
};
