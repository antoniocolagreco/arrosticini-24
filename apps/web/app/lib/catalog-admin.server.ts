import { catalogContract, type ProductStatus } from "@arrosticini/contracts";
import { ORPCError } from "@orpc/client";
import { data, type RouterContextProvider, redirect } from "react-router";
import { api } from "./api.server.js";
import { type AuthSessionData, assertSameOrigin, requireUser } from "./session.server.js";

export interface CatalogAdminResult {
  error: string | null;
  errors: Record<string, string>;
  values: Record<string, string>;
  success?: "saved" | "imageAdded" | "imageRemoved" | "restored";
  archived?: { slug: string; name: { it: string; en: string }; status: ProductStatus };
}

export function requireAdmin(
  context: Readonly<RouterContextProvider>,
  locale: string,
): AuthSessionData {
  const user: AuthSessionData = requireUser(context, locale);
  if (user.role !== "admin") throw new Response(null, { status: 403 });
  return user;
}

export async function catalogAdminAction(
  request: Request,
  context: Readonly<RouterContextProvider>,
  locale: "it" | "en",
  slug?: string,
) {
  assertSameOrigin(request);
  const user: AuthSessionData = requireAdmin(context, locale);
  const client = api(request, { userId: user.userId, role: user.role });
  const form: FormData = await request.formData();
  const values: Record<string, string> = {};
  for (const [key, value] of form) if (typeof value === "string") values[key] = value;
  const result: CatalogAdminResult = { values, errors: {}, error: null };
  const intent: string | undefined = values.intent;
  try {
    if (intent === "archive" || intent === "restore") {
      const schema = catalogContract.updateProduct["~orpc"].inputSchema;
      if (!schema) throw new Error("Catalog input schema is missing");
      const input = schema.safeParse({
        slug: values.slug,
        status: intent === "archive" ? "ARCHIVED" : values.status,
      });
      if (!input.success || (intent === "restore" && input.data.status === undefined))
        return data<CatalogAdminResult>({ ...result, error: "invalidForm" }, { status: 400 });
      const previous = await client.catalog.getProduct({ slug: input.data.slug });
      await client.catalog.updateProduct(input.data);
      return data<CatalogAdminResult>({
        ...result,
        ...(intent === "archive"
          ? { archived: { slug: previous.slug, name: previous.name, status: previous.status } }
          : { success: "restored" }),
      });
    }
    if (intent === "upload" && slug) {
      const schema = catalogContract.addProductImage["~orpc"].inputSchema;
      if (!schema) throw new Error("Catalog input schema is missing");
      const input = schema.safeParse({ slug, file: form.get("file") });
      if (!input.success)
        return data<CatalogAdminResult>({ ...result, error: "imageHint" }, { status: 400 });
      await client.catalog.addProductImage(input.data);
      return data<CatalogAdminResult>({ ...result, success: "imageAdded" });
    }
    if (intent === "removeImage" && slug) {
      const schema = catalogContract.removeProductImage["~orpc"].inputSchema;
      if (!schema) throw new Error("Catalog input schema is missing");
      const input = schema.safeParse({ slug, imageId: values.imageId });
      if (!input.success)
        return data<CatalogAdminResult>({ ...result, error: "invalidForm" }, { status: 400 });
      await client.catalog.removeProductImage(input.data);
      return data<CatalogAdminResult>({ ...result, success: "imageRemoved" });
    }
    if (intent !== "save")
      return data<CatalogAdminResult>({ ...result, error: "invalidForm" }, { status: 400 });
    const price: string = (values.price ?? "").trim().replace(",", ".");
    const schema = catalogContract.createProduct["~orpc"].inputSchema;
    if (!schema) throw new Error("Catalog input schema is missing");
    const input = schema.safeParse({
      slug: slug ?? values.slug,
      name: { it: values.nameIt, en: values.nameEn },
      description: { it: values.descriptionIt, en: values.descriptionEn },
      priceCents: /^\d+(?:\.\d{1,2})?$/.test(price) ? Math.round(Number(price) * 100) : NaN,
      pieces: values.pieces?.trim() ? Number(values.pieces) : undefined,
      status: values.status,
    });
    if (!input.success) {
      for (const issue of input.error.issues) {
        const key: string =
          issue.path[0] === "name" || issue.path[0] === "description"
            ? `${issue.path[0]}${issue.path[1] === "en" ? "En" : "It"}`
            : issue.path[0] === "priceCents"
              ? "price"
              : String(issue.path[0]);
        result.errors[key] = `${key}Hint`;
      }
      return data<CatalogAdminResult>(result, { status: 400 });
    }
    if (slug) {
      await client.catalog.updateProduct({ ...input.data, pieces: input.data.pieces ?? null });
      return data<CatalogAdminResult>({ ...result, success: "saved" });
    }
    const created = await client.catalog.createProduct(input.data);
    return redirect(`/${locale}/admin/products/${created.slug}?created=1`, { status: 303 });
  } catch (error: unknown) {
    if (!(error instanceof ORPCError)) throw error;
    if (error.code === "PRODUCT_SLUG_TAKEN")
      return data<CatalogAdminResult>(
        { ...result, errors: { slug: "slugTaken" } },
        { status: 409 },
      );
    if (error.code === "INVALID_IMAGE")
      return data<CatalogAdminResult>({ ...result, error: "invalidImage" }, { status: 422 });
    if (error.code === "PRODUCT_IMAGE_NOT_FOUND")
      return data<CatalogAdminResult>({ ...result, error: "imageMissing" }, { status: 404 });
    if (error.code === "BAD_REQUEST")
      return data<CatalogAdminResult>({ ...result, error: "invalidForm" }, { status: 400 });
    if (error.code === "PRODUCT_NOT_FOUND") throw new Response(null, { status: 404 });
    if (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")
      throw new Response(null, { status: error.code === "FORBIDDEN" ? 403 : 401 });
    throw error;
  }
}
