import { oc } from "@orpc/contract";
import { z } from "zod";
import { ProductSlug } from "./catalog.js";
import { authed, IdDto } from "./common.js";

export const MAX_LINE_QUANTITY = 99;

export const CartLineDto = z.object({
  slug: ProductSlug,
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});

export const CartDto = z.object({
  id: IdDto,
  lines: z.array(CartLineDto),
  updatedAt: z.iso.datetime(),
});

export type CartLineDto = z.infer<typeof CartLineDto>;
export type CartDto = z.infer<typeof CartDto>;

const cartNotFound = { CART_NOT_FOUND: { status: 404 } } as const;

export const createCart = oc
  .route({ method: "POST", path: "/shopping/carts", successStatus: 201 })
  .output(CartDto);

export const getCart = oc
  .route({ method: "GET", path: "/shopping/carts/{id}" })
  .input(z.object({ id: IdDto }))
  .output(CartDto)
  .errors(cartNotFound);

export const setCartLine = oc
  .route({ method: "PUT", path: "/shopping/carts/{id}/lines/{slug}" })
  .input(
    z.object({
      id: IdDto,
      slug: ProductSlug,
      quantity: z.number().int().min(0).max(MAX_LINE_QUANTITY),
    }),
  )
  .output(CartDto)
  .errors({ ...cartNotFound, PRODUCT_NOT_FOUND: { status: 404 } });

export const mergeCart = authed
  .route({ method: "POST", path: "/shopping/carts/{id}/merge" })
  .input(z.object({ id: IdDto }))
  .output(CartDto)
  .errors(cartNotFound);

export const shoppingContract = {
  createCart,
  getCart,
  setCartLine,
  mergeCart,
};
