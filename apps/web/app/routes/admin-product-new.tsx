import { ProductEditor } from "../components/product-editor.js";
import { catalogAdminAction, requireAdmin } from "../lib/catalog-admin.server.js";
import type { Route } from "./+types/admin-product-new.js";

export function loader({ context, params }: Route.LoaderArgs) {
  requireAdmin(context, params.lang);
  return null;
}

export async function action({ request, context, params }: Route.ActionArgs) {
  return catalogAdminAction(request, context, params.lang === "en" ? "en" : "it");
}

export default function NewProduct({ actionData }: Route.ComponentProps) {
  return <ProductEditor {...(actionData ? { result: actionData } : {})} />;
}
