import { redirect } from "react-router";
import { preferredLocale } from "../lib/locale.server.js";
import type { Route } from "./+types/redirect.js";

export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
  return redirect(`/${await preferredLocale(request)}`, {
    headers: { Vary: "Cookie, Accept-Language", "Cache-Control": "private, no-store" },
  });
}
