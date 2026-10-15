import { ProductSlug } from "@arrosticini/contracts";
import { ProductEditor } from "../components/product-editor.js";
import { api, getApiError } from "../lib/api.server.js";
import { catalogAdminAction, requireAdmin } from "../lib/catalog-admin.server.js";
import { productImages } from "../lib/product.server.js";
import type { Route } from "./+types/admin-product.js";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const user = requireAdmin(context, params.lang);
  const slug = ProductSlug.safeParse(params.slug);
  if (!slug.success) throw new Response(null, { status: 404 });
  try {
    const product = await api(request, { userId: user.userId, role: user.role }).catalog.getProduct(
      { slug: slug.data },
    );
    return {
      product,
      images: productImages(product),
      created: new URL(request.url).searchParams.get("created") === "1",
    };
  } catch (error: unknown) {
    if (getApiError(error) === "PRODUCT_NOT_FOUND") throw new Response(null, { status: 404 });
    throw error;
  }
}

export async function action({ request, context, params }: Route.ActionArgs) {
  return catalogAdminAction(request, context, params.lang === "en" ? "en" : "it", params.slug);
}

export default function AdminProduct({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <ProductEditor
      key={loaderData.product.slug}
      product={loaderData.product}
      images={loaderData.images}
      {...(actionData ? { result: actionData } : {})}
      created={loaderData.created}
    />
  );
}
