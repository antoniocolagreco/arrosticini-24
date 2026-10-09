import {
  type ActorDto,
  type CartDto,
  type ProductDto,
  shoppingContract,
} from "@arrosticini/contracts";
import { data, type RouterContextProvider } from "react-router";
import { api, getApiError } from "./api.server.js";
import { productImages } from "./product.server.js";
import {
  assertSameOrigin,
  requireUser,
  sessionContext,
  sessionStorageContext,
} from "./session.server.js";

export interface CartProduct {
  slug: string;
  quantity: number;
  product: ProductDto | null;
  image: string | undefined;
}

export interface CartResult {
  ok: boolean;
  slug: string;
  quantity: number;
  error: string | null;
}

export function cartTotal(lines: CartProduct[]): number | null {
  return lines.some((line) => !line.product)
    ? null
    : lines.reduce((sum, line) => sum + (line.product?.priceCents ?? 0) * line.quantity, 0);
}

export async function mergeOwnedCart(
  request: Request,
  actor: ActorDto,
  cartId?: string,
): Promise<CartDto> {
  const client = api(request, actor);
  if (cartId) {
    try {
      return await client.shopping.mergeCart({ id: cartId });
    } catch (error: unknown) {
      if (getApiError(error) !== "CART_NOT_FOUND") throw error;
    }
  }
  const id: string = (await client.shopping.createCart()).id;
  return client.shopping.mergeCart({ id });
}

export async function readCart(
  request: Request,
  context: Readonly<RouterContextProvider>,
): Promise<CartDto | null> {
  const id: string | undefined = context.get(sessionContext).get("cartId");
  if (!id) return null;
  try {
    return await api(request).shopping.getCart({ id });
  } catch (error: unknown) {
    if (getApiError(error) === "CART_NOT_FOUND") return null;
    throw error;
  }
}

export async function cartProducts(request: Request, cart: CartDto | null): Promise<CartProduct[]> {
  return Promise.all(
    (cart?.lines ?? []).map(async ({ slug, quantity }): Promise<CartProduct> => {
      try {
        const product: ProductDto = await api(request).catalog.getProduct({ slug });
        return { slug, quantity, product, image: productImages(product)[0] };
      } catch (error: unknown) {
        if (getApiError(error) !== "PRODUCT_NOT_FOUND") throw error;
        return { slug, quantity, product: null, image: undefined };
      }
    }),
  );
}

export async function changeCart(
  request: Request,
  context: Readonly<RouterContextProvider>,
  locale: string,
) {
  assertSameOrigin(request);
  const form: FormData = await request.formData();
  const slug: string = typeof form.get("slug") === "string" ? String(form.get("slug")) : "";
  const intent: FormDataEntryValue | null = form.get("intent");
  const raw: FormDataEntryValue | null = form.get("quantity");
  const quantity: number = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  const result: CartResult = { ok: false, slug, quantity, error: null };
  const schema = shoppingContract.setCartLine["~orpc"].inputSchema;
  if (!schema) throw new Error("Shopping input schema is missing");
  if (
    (intent !== "add" && intent !== "set") ||
    (intent === "add" && quantity === 0) ||
    !schema.omit({ id: true }).safeParse({ slug, quantity }).success
  )
    return data<CartResult>({ ...result, error: "invalidQuantity" }, { status: 400 });
  let cart: CartDto | null = await readCart(request, context);
  const session = context.get(sessionContext);
  if (!cart) {
    if (session.has("userId")) {
      const user = requireUser(context, locale);
      cart = await mergeOwnedCart(request, { userId: user.userId, role: user.role });
    } else {
      cart = await api(request).shopping.createCart();
    }
  }
  const current: number = cart.lines.find((line) => line.slug === slug)?.quantity ?? 0;
  const next: number = intent === "add" ? current + quantity : quantity;
  const input = schema.safeParse({ id: cart.id, slug, quantity: next });
  if (!input.success)
    return data<CartResult>({ ...result, error: "invalidQuantity" }, { status: 400 });
  try {
    await api(request).shopping.setCartLine(input.data);
    session.set("cartId", cart.id);
    return data<CartResult>(
      { ...result, ok: true, quantity: next },
      {
        headers: { "Set-Cookie": await context.get(sessionStorageContext).commitSession(session) },
      },
    );
  } catch (error: unknown) {
    const code: ReturnType<typeof getApiError> = getApiError(error);
    if (code === "PRODUCT_NOT_FOUND" || code === "CART_NOT_FOUND" || code === "BAD_REQUEST")
      return data<CartResult>(
        {
          ...result,
          error:
            code === "PRODUCT_NOT_FOUND"
              ? "productUnavailable"
              : code === "CART_NOT_FOUND"
                ? "cartExpired"
                : "invalidQuantity",
        },
        { status: code === "BAD_REQUEST" ? 400 : 404 },
      );
    throw error;
  }
}
