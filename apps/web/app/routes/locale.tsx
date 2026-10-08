import { isLocale } from "@arrosticini/kernel";
import { Outlet } from "react-router";
import type { Route } from "./+types/locale.js";

export function loader({ params }: Route.LoaderArgs): null {
  if (!isLocale(params.lang)) throw new Response(null, { status: 404 });
  return null;
}

export default function LocaleLayout() {
  return <Outlet />;
}
